import { tool } from "@opencode-ai/plugin"
import {
  resolveApiKey,
  buildTokenPlanUrl,
  downloadFile,
  pollTask,
} from "./shared"

export default tool({
  description:
    "Generate a video with character consistency from 1-9 reference images using HappyHorse 1.1 R2V through Qwen Token Plan. " +
    "Reference subjects from different images in the prompt using [Image 1], [Image 2], etc. No watermark.",
  args: {
    prompt: tool.schema
      .string()
      .describe(
        "Text description using [Image 1], [Image 2] etc. to reference each image by array order. " +
        'Example: "The woman in red from [Image 1] walks through a garden." Max 5000 non-Chinese chars.'
      ),
    images: tool.schema
      .array(tool.schema.string())
      .describe(
        "Array of 1-9 reference image URLs or base64 strings. " +
        "Order in the array = [Image 1], [Image 2], etc. in the prompt. " +
        "Formats: JPEG, PNG, WEBP. Min 400px shortest side recommended. Max 20MB each."
      ),
    output: tool.schema
      .string()
      .describe(
        "Absolute file path to save the video, e.g. D:/project/videos/scene.mp4. Creates parent directories if needed."
      ),
    duration: tool.schema
      .number()
      .optional()
      .default(5)
      .describe("Video duration in seconds. Range: 3-15."),
    resolution: tool.schema
      .string()
      .optional()
      .default("720P")
      .describe("Resolution: 720P or 1080P."),
    ratio: tool.schema
      .string()
      .optional()
      .default("16:9")
      .describe(
        "Aspect ratio: 16:9, 9:16, 1:1, 4:3, 3:4, 4:5, 5:4, 9:21, or 21:9."
      ),
    seed: tool.schema
      .number()
      .optional()
      .describe(
        "Seed for reproducible results. Same seed + same params = similar output."
      ),
  },
  async execute(args) {
    const apiKey = resolveApiKey()

    if (!args.images || args.images.length === 0) {
      throw new Error("At least 1 reference image is required.")
    }
    if (args.images.length > 9) {
      throw new Error("Maximum 9 reference images allowed.")
    }

    const parameters: Record<string, unknown> = {
      resolution: args.resolution || "720P",
      ratio: args.ratio || "16:9",
      duration: args.duration ?? 5,
      watermark: false,
    }

    if (args.seed !== undefined) {
      parameters.seed = args.seed
    }

    const media = args.images.map((url) => ({
      type: "reference_image",
      url,
    }))

    const resp = await fetch(
      buildTokenPlanUrl(
        "/api/v1/services/aigc/video-generation/video-synthesis"
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model: "happyhorse-1.1-r2v",
          input: { prompt: args.prompt, media },
          parameters,
        }),
      }
    )

    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Video task submission failed (${resp.status}): ${err}`)
    }

    const task = await resp.json()
    const taskId = task?.output?.task_id
    if (!taskId) {
      throw new Error(
        `No task_id in response: ${JSON.stringify(task)}`
      )
    }

    const result = await pollTask(apiKey, taskId)
    const videoUrl = result?.output?.video_url
    if (!videoUrl) {
      throw new Error(
        `No video_url in completed task: ${JSON.stringify(result)}`
      )
    }

    const savedPath = await downloadFile(videoUrl, args.output)
    return `Video saved to ${savedPath}`
  },
})
