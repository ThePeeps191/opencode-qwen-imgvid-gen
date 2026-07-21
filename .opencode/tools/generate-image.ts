import { tool } from "@opencode-ai/plugin"
import { resolveApiKey, buildTokenPlanUrl, downloadFile } from "./shared"

export default tool({
  description:
    "Generate images using Wan 2.7 Image through Qwen Token Plan. " +
    "Uses wan2.7-image by default (faster, lower cost, up to 2K). " +
    "Only set pro=true when you need 4K resolution or maximum quality. " +
    "Supports text-to-image, image editing (pass image + editInstruction), " +
    "and sequential image sets (imageSet). No watermark.",
  args: {
    prompt: tool.schema
      .string()
      .describe(
        "Text description of the image. Max 5000 characters. Supports Chinese and English."
      ),
    output: tool.schema
      .string()
      .describe(
        "Absolute file path to save the image, e.g. D:/project/outputs/logo.png. Creates parent directories if needed."
      ),
    pro: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Use wan2.7-image-pro (4K capable, slower, higher cost). Default false = wan2.7-image."
      ),
    size: tool.schema
      .string()
      .optional()
      .default("2K")
      .describe(
        "Resolution preset: 1K (1024x1024), 2K (2048x2048), or 4K (4096x4096, pro only, text-to-image only). Ignored when width+height are set."
      ),
    width: tool.schema
      .number()
      .optional()
      .describe(
        "Custom width in pixels. Must be used together with height. Overrides size preset. Range: 768-4096 (pro t2i) or 768-2048 (other scenarios)."
      ),
    height: tool.schema
      .number()
      .optional()
      .describe(
        "Custom height in pixels. Must be used together with width."
      ),
    count: tool.schema
      .number()
      .optional()
      .default(1)
      .describe("Number of images. 1-4 standard, 1-12 with imageSet=true."),
    image: tool.schema
      .string()
      .optional()
      .describe(
        "URL or base64 of a reference image for editing or multi-image reference."
      ),
    editInstruction: tool.schema
      .string()
      .optional()
      .describe(
        "Edit instruction when providing a reference image, e.g. 'Replace the car with a truck'."
      ),
    imageSet: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Enable sequential image set mode for character-consistent multi-image stories."
      ),
    imageSetCount: tool.schema
      .number()
      .optional()
      .default(12)
      .describe("Max images in image set mode. Default 12."),
    thinking: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Thinking mode for higher quality. Only applies to text-to-image with no reference image."
      ),
    seed: tool.schema
      .number()
      .optional()
      .describe(
        "Random seed for reproducible results. Same seed + same params = similar outputs."
      ),
    colorPalette: tool.schema
      .array(
        tool.schema.object({
          hex: tool.schema.string().describe("Hex color e.g. #C2D1E6"),
          ratio: tool.schema
            .string()
            .describe("Percentage e.g. '60.00%'"),
        })
      )
      .optional()
      .describe(
        "Custom color theme: 3-10 colors with ratios summing to 100%. Not compatible with imageSet."
      ),
  },
  async execute(args) {
    const apiKey = resolveApiKey()
    const model = args.pro ? "wan2.7-image-pro" : "wan2.7-image"

    const content: { text?: string; image?: string }[] = []
    if (args.image && args.editInstruction) {
      content.push({ image: args.image })
      content.push({ text: args.editInstruction })
    } else if (args.image) {
      content.push({ image: args.image })
      content.push({ text: args.prompt })
    } else {
      content.push({ text: args.prompt })
    }

    if ((args.width !== undefined) !== (args.height !== undefined)) {
      throw new Error("Both width and height must be provided together, or neither.")
    }

    const parameters: Record<string, unknown> = {
      n: args.imageSet ? args.imageSetCount : args.count,
      size: (args.width && args.height) ? `${args.width}*${args.height}` : (args.size || "2K"),
      watermark: false,
    }

    if (args.imageSet) {
      parameters.enable_sequential = true
    }

    if (args.thinking && !args.image && !args.imageSet) {
      parameters.thinking_mode = true
    }

    if (args.seed !== undefined) {
      parameters.seed = args.seed
    }

    if (args.colorPalette && !args.imageSet) {
      parameters.color_palette = args.colorPalette
    }

    const resp = await fetch(
      buildTokenPlanUrl(
        "/api/v1/services/aigc/multimodal-generation/generation"
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: {
            messages: [{ role: "user", content }],
          },
          parameters,
        }),
      }
    )

    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Image generation failed (${resp.status}): ${err}`)
    }

    const data = await resp.json()

    const choices = data?.output?.choices
    if (!choices || choices.length === 0) {
      throw new Error(
        `Image generation failed: no images returned. Response: ${JSON.stringify(data)}`
      )
    }

    const results: string[] = []
    for (let i = 0; i < choices.length; i++) {
      const imageUrl = choices[i]?.message?.content?.[0]?.image
      if (!imageUrl) continue

      const savePath =
        choices.length === 1
          ? args.output
          : args.output.replace(/\.(\w+)$/, `_${i + 1}.$1`)

      const saved = await downloadFile(imageUrl, savePath)
      results.push(saved)
    }

    if (results.length === 0) {
      throw new Error(
        `Image generation failed: no image URLs in response. Response: ${JSON.stringify(data)}`
      )
    }

    const lines = results.map((p) => `  - ${p}`).join("\n")
    return `Generated ${results.length} image(s):\n${lines}`
  },
})
