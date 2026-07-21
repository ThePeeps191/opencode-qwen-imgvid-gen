import { homedir } from "os"
import { join, dirname } from "path"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs"

const TOKEN_PLAN_DOMAIN = "token-plan.ap-southeast-1.maas.aliyuncs.com"

export function resolveApiKey(): string {
  try {
    const authPath = join(homedir(), ".local", "share", "opencode", "auth.json")
    if (existsSync(authPath)) {
      const auth = JSON.parse(readFileSync(authPath, "utf-8"))
      const raw = auth?.["alibaba-token-plan"]?.key
      if (raw) return String(raw).trim()
    }
  } catch {}

  try {
    const configPath = join(homedir(), ".config", "opencode", "opencode.json")
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, "utf-8"))
      const key =
        config.provider?.["bailian-token-plan-personal"]?.options?.apiKey ??
        config.provider?.["bailian-token-plan"]?.options?.apiKey
      if (key) return key
    }
  } catch {}

  const envKey = process.env.QWEN_TOKEN_PLAN_API_KEY
  if (envKey) return envKey.trim()

  throw new Error(
    "QWEN_TOKEN_PLAN_API_KEY not found. " +
    "Set it as env var, or check ~/.local/share/opencode/auth.json has alibaba-token-plan.key"
  )
}

export function buildTokenPlanUrl(path: string): string {
  return `https://${TOKEN_PLAN_DOMAIN}${path}`
}

export async function downloadFile(url: string, outputPath: string): Promise<string> {
  const dir = dirname(outputPath)
  if (dir) mkdirSync(dir, { recursive: true })

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`)

  const buf = Buffer.from(await resp.arrayBuffer())
  writeFileSync(outputPath, buf)
  return outputPath
}

export interface TaskStatusResponse {
  output?: {
    task_id?: string
    task_status?: string
    video_url?: string
    code?: string
    message?: string
  }
}

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 120000

export async function pollTask(
  apiKey: string,
  taskId: string
): Promise<TaskStatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))

    const resp = await fetch(buildTokenPlanUrl(`/api/v1/tasks/${taskId}`), {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

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
