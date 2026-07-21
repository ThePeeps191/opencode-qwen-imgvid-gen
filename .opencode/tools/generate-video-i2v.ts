import { tool } from "@opencode-ai/plugin"
import {
  resolveApiKey,
  buildTokenPlanUrl,
  downloadFile,
  type TaskStatusResponse,
} from "./shared"

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 120000

async function pollTask(
  apiKey: string,
  taskId: string
): Promise<TaskStatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))

    const resp = await fetch(
      buildTokenPlanUrl(`/api/v1/tasks/${taskId}`),
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Task poll failed (${resp.status}): ${err}`)
    }

    const data: TaskStatusResponse = await resp.json()
    const status = data?.output?.task_status

    if (status === "SUCCEEDED") return data
    if (status === "FAILED") {
      throw new Error(
        `Video generation failed: ${data?.output?.message || "Unknown error"}`
      )
    }
  }

  throw new Error("Video generation timed out after 120 seconds")
}

export default tool({
  description:
    "Generate a video from a first-frame image using HappyHorse 1.1 I2V through Qwen Token Plan. " +
    "Animates a still image into motion with auto-generated audio. The output aspect ratio follows the input image. No watermark.",
  args: {
    image: tool.schema
      .string()
      .describe(
        "URL or base64 of the first-frame image. Formats: JPEG, PNG, WEBP. Min 300px per side, max 20MB."
      ),
    output: tool.schema
      .string()
      .describe(
        "Absolute file path to save the video, e.g. D:/project/videos/animation.mp4. Creates parent directories if needed."
      ),
    prompt: tool.schema
      .string()
      .optional()
      .describe(
        "Text description of the motion to animate. Optional — if omitted, the model infers motion from the image."
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
    seed: tool.schema
      .number()
      .optional()
      .describe(
        "Seed for reproducible results. Same seed + same params = similar output."
      ),
  },
  async execute(args) {
    const apiKey = resolveApiKey()

    const parameters: Record<string, unknown> = {
      resolution: args.resolution || "720P",
      duration: args.duration ?? 5,
      watermark: false,
    }

    if (args.seed !== undefined) {
      parameters.seed = args.seed
    }

    const media = [{ type: "first_frame", url: args.image }]

    const input: Record<string, unknown> = { media }
    if (args.prompt) {
      input.prompt = args.prompt
    }

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
          model: "happyhorse-1.1-i2v",
          input,
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
