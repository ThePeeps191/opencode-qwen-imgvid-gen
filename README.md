# OpenCode + Qwen Image/Video Generation Tools

OpenCode custom tools for generating images and videos with [Wan 2.7 Image](https://www.qwencloud.com/models/wan2.7-image-pro) and [HappyHorse 1.1](https://www.qwencloud.com/models/happyhorse-1.1-t2v) through the [Qwen Token Plan](https://www.qwencloud.com/pricing/token-plan).

Similar to how GPT models in Codex use GPT Image 2 for automatic image generation, these tools let any OpenCode model generate images and videos — provided a Qwen Token Plan is connected.

## Tools

| Tool | File | What it does |
|------|------|-------------|
| `generate-image` | `.opencode/tools/generate-image.ts` | Text-to-image, image editing, image sets via Wan 2.7 Image (sync) |
| `generate-video-t2v` | `.opencode/tools/generate-video-t2v.ts` | Text-to-video via HappyHorse 1.1 T2V (async) |
| `generate-video-i2v` | `.opencode/tools/generate-video-i2v.ts` | Image-to-video via HappyHorse 1.1 I2V (async) |
| `generate-video-r2v` | `.opencode/tools/generate-video-r2v.ts` | Reference-to-video via HappyHorse 1.1 R2V (async) |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (OpenCode requirement)
- [OpenCode](https://opencode.ai) installed (`npm install -g opencode-ai`)
- An active [Qwen Token Plan](https://www.qwencloud.com/pricing/token-plan) subscription (Lite $6/mo, Standard, or Pro)
- Your Token Plan API key (`sk-sp-...`) — get it from the [Qwen Token Plan console](https://home.qwencloud.com/api-keys)

---

## Installation

### 1. Add the tools to your project

Copy the `.opencode/tools/` directory into the root of any project where you want image/video generation available:

```
cp -r .opencode/tools/ /path/to/your/project/.opencode/tools/
```

Each tool is self-contained and will be auto-discovered by OpenCode when you're working in that project.

### 2. Make sure your Token Plan key is accessible

The tools find your API key automatically from one of these sources (checked in order):

| Priority | Source | Location |
|----------|--------|----------|
| 1 | OpenCode auth store | `~/.local/share/opencode/auth.json` → `alibaba-token-plan.key` |
| 2 | OpenCode config | `~/.config/opencode/opencode.json` → `provider.bailian-token-plan-personal.options.apiKey` |
| 3 | Environment variable | `$QWEN_TOKEN_PLAN_API_KEY` |

If you already use OpenCode with a Token Plan, your key is likely already in `auth.json` from the `/auth` setup flow — **no action needed**.

If not, set it manually:

```bash
# Option A: via OpenCode auth flow
opencode auth

# Option B: set env var (session only)
export QWEN_TOKEN_PLAN_API_KEY="sk-sp-your-key-here"

# Option C: add to opencode.json
# Edit ~/.config/opencode/opencode.json and add:
# "provider": {
#   "bailian-token-plan-personal": {
#     "npm": "@ai-sdk/anthropic",
#     "name": "Qwen Token Plan",
#     "options": {
#       "baseURL": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
#       "apiKey": "sk-sp-..."
#     }
#   }
# }
```

Do not use your pay-as-you-go key (`sk-...`) or the `dashscope-intl.aliyuncs.com` domain — they are not interchangeable.

### 3. Verify it works

Open OpenCode in your project and ask it to use a tool. For example:

```
Generate an image of a mountain lake and save it to test.png
```

If the tools are loaded correctly, OpenCode will call `generate-image` and produce the output.

---

## Tool reference

### `generate-image`

Generate images using Wan 2.7 Image. Uses `wan2.7-image` by default (faster, lower cost, up to 2K). Set `pro=true` to use `wan2.7-image-pro` for 4K resolution or maximum quality.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Text description. Max 5000 characters |
| `output` | string | **required** | Absolute path to save the image, e.g. `D:/project/logo.png` |
| `pro` | boolean | `false` | Use `wan2.7-image-pro` (4K capable, slower, higher cost) |
| `size` | string | `"2K"` | Preset: `"1K"` (1024²), `"2K"` (2048²), `"4K"` (4096², pro only, t2i only) |
| `width` | number | — | Custom width in pixels. Must be used with `height`. Overrides `size`. Range: 768-4096 |
| `height` | number | — | Custom height in pixels. Must be used with `width` |
| `count` | number | `1` | Number of images. 1-4 standard, 1-12 with `imageSet=true` |
| `image` | string | — | URL or base64 of a reference image for editing |
| `editInstruction` | string | — | Edit prompt (requires `image`) |
| `imageSet` | boolean | `false` | Sequential image set mode for consistent characters across scenes |
| `imageSetCount` | number | `12` | Max images in image set mode |
| `thinking` | boolean | `false` | Thinking mode for higher quality (t2i only, no image input) |
| `seed` | number | — | Random seed for reproducible results |
| `colorPalette` | array | — | Custom color theme: `[{hex, ratio}, ...]` 3-10 colors summing to 100% |

**Scenarios:**

- **Text-to-image** — provide `prompt` only
- **Image editing** — provide `image` + `editInstruction` (or `image` + `prompt`)
- **Image set** — set `imageSet=true` for multi-image stories
- **Custom resolution** — provide `width` + `height` instead of `size`

---

### `generate-video-t2v`

Generate a video from a text description using HappyHorse 1.1 T2V. No reference image needed. Auto-generated audio.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Video description. Max 5000 non-Chinese chars |
| `output` | string | **required** | Absolute path to save the video, e.g. `D:/videos/scene.mp4` |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `ratio` | string | `"16:9"` | `16:9`, `9:16`, `1:1`, `4:3`, `3:4`, `4:5`, `5:4`, `9:21`, `21:9` |
| `seed` | number | — | Seed for reproducible results |

---

### `generate-video-i2v`

Animate a still image into motion using HappyHorse 1.1 I2V. Output aspect ratio follows the input image.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `image` | string | **required** | URL or base64 of the first-frame image. JPEG/PNG/WEBP, min 300px per side, max 20MB |
| `output` | string | **required** | Absolute path to save the video |
| `prompt` | string | — | Optional motion description. If omitted, model infers motion from the image |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `seed` | number | — | Seed for reproducible results |

---

### `generate-video-r2v`

Generate a video with character consistency from 1-9 reference images using HappyHorse 1.1 R2V. Reference subjects in the prompt using `[Image 1]`, `[Image 2]`, etc.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Description using `[Image 1]`, `[Image 2]` to reference images by array order |
| `images` | string[] | **required** | 1-9 reference image URLs or base64 strings. Order = `[Image 1]`, `[Image 2]`... |
| `output` | string | **required** | Absolute path to save the video |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `ratio` | string | `"16:9"` | Aspect ratio (same options as T2V) |
| `seed` | number | — | Seed for reproducible results |

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  OpenCode    │────▶│  Custom Tool     │────▶│  Qwen Token Plan │
│  (any model) │     │  (.opencode/)    │     │  API (sk-sp-...) │
└──────────────┘     └──────────────────┘     └──────────────────┘
                              │                        │
                              ▼                        ▼
                      ┌──────────────┐         ┌──────────────┐
                      │  shared.ts   │         │ Wan 2.7 /    │
                      │  (auth,      │         │ HappyHorse   │
                      │   download)  │         │ 1.1 models   │
                      └──────────────┘         └──────────────┘
```

All tools share a common `shared.ts` module that handles:
- **Authentication** — reads the `sk-sp-...` key from OpenCode's auth store or config
- **API routing** — builds URLs against the Token Plan domain
- **File download** — saves generated media to the specified path, creating directories as needed

Video tools follow an async pattern: submit a task, poll every 3 seconds until complete, then download. Image generation is synchronous — single request, immediate result.

## Important notes

- **No watermark** — `watermark: false` is hardcoded in all tools. Outputs are clean.
- **Token Plan domain only** — All tools use `token-plan.ap-southeast-1.maas.aliyuncs.com`. Pay-as-you-go keys and the `dashscope-intl` domain will not work.
- **Credits consumption** — Image generation deducts credits per image. Video generation deducts per second of output. Costs are billed through your Token Plan subscription.
- **Video polling** — Video tools poll the task status every 3 seconds with a 120-second timeout. Large/long videos may take longer.
- **URL expiry** — Generated image and video URLs expire in 24 hours. The tools download immediately so the local file is permanent.
- **Custom dimensions** — The minimum supported resolution is 768×768 pixels. Use `width`/`height` for arbitrary sizes within the valid range.

## License

MIT
