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
    "Generate a video from a text description using HappyHorse 1.1 T2V through Qwen Token Plan. " +
    "No reference image needed. Creates a video with auto-generated audio. No watermark.",
  args: {
    prompt: tool.schema
      .string()
      .describe(
        "Text description of the video. Max 5000 non-Chinese chars or 2500 Chinese chars."
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

    const parameters: Record<string, unknown> = {
      resolution: args.resolution || "720P",
      ratio: args.ratio || "16:9",
      duration: args.duration ?? 5,
      watermark: false,
    }

    if (args.seed !== undefined) {
      parameters.seed = args.seed
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
          model: "happyhorse-1.1-t2v",
          input: { prompt: args.prompt },
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
