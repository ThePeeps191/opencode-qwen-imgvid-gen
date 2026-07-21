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

## Setup

Copy `.opencode/tools/` into the root of your project, then make sure your Token Plan key is accessible.

The tools find your API key automatically from these sources (checked in order):

| Priority | Source | Location |
|----------|--------|----------|
| 1 | OpenCode auth store | `~/.local/share/opencode/auth.json` → `alibaba-token-plan.key` |
| 2 | OpenCode config | `~/.config/opencode/opencode.json` → `provider.bailian-token-plan-personal.options.apiKey` |
| 3 | Environment variable | `$QWEN_TOKEN_PLAN_API_KEY` |

If you already use OpenCode with a Token Plan, your key is likely in `auth.json` from the `/auth` setup flow — **no action needed**.

Otherwise, set it:

```bash
# Option A: OpenCode auth flow
opencode auth

# Option B: env var
export QWEN_TOKEN_PLAN_API_KEY="sk-sp-your-key-here"

# Option C: add to ~/.config/opencode/opencode.json
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

Do not use your pay-as-you-go key (`sk-...`) or the `dashscope-intl.aliyuncs.com` domain — they will not work.

## Tool reference

### `generate-image`

Generate images using Wan 2.7 Image. Uses `wan2.7-image` by default (faster, lower cost, up to 2K). Set `pro=true` for `wan2.7-image-pro` (4K, maximum quality).

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Text description. Max 5000 characters |
| `output` | string | **required** | Absolute path to save the image |
| `pro` | boolean | `false` | Use `wan2.7-image-pro` (4K capable, slower, higher cost) |
| `size` | string | `"2K"` | `"1K"` (1024²), `"2K"` (2048²), `"4K"` (4096², pro only, t2i only) |
| `width` | number | — | Custom width in pixels. Must be used with `height`. Overrides `size`. Min 768 |
| `height` | number | — | Custom height in pixels. Must be used with `width` |
| `count` | number | `1` | Number of images. 1-4, or 1-12 with `imageSet=true` |
| `image` | string | — | URL or base64 of a reference image for editing |
| `editInstruction` | string | — | Edit prompt (requires `image`) |
| `imageSet` | boolean | `false` | Sequential image set mode for consistent characters across scenes |
| `imageSetCount` | number | `12` | Max images in image set mode |
| `thinking` | boolean | `false` | Thinking mode for higher quality (t2i only, no image input) |
| `seed` | number | — | Random seed for reproducible results |
| `colorPalette` | array | — | Custom color theme: `[{hex, ratio}, ...]` 3-10 colors |

**Scenarios:**
- **Text-to-image** — provide `prompt` only
- **Image editing** — provide `image` + `editInstruction`
- **Image set** — set `imageSet=true` for multi-image stories
- **Custom resolution** — provide `width` + `height` instead of `size`

---

### `generate-video-t2v`

Generate a video from text using HappyHorse 1.1 T2V. No reference image needed. Auto-generated audio.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Video description |
| `output` | string | **required** | Absolute path to save the video |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `ratio` | string | `"16:9"` | `16:9`, `9:16`, `1:1`, `4:3`, `3:4`, `4:5`, `5:4`, `9:21`, `21:9` |
| `seed` | number | — | Seed for reproducible results |

---

### `generate-video-i2v`

Animate a still image into motion using HappyHorse 1.1 I2V. Output aspect ratio follows the input image.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `image` | string | **required** | URL or base64 of the first-frame image |
| `output` | string | **required** | Absolute path to save the video |
| `prompt` | string | — | Optional motion description. If omitted, model infers from image |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `seed` | number | — | Seed for reproducible results |

---

### `generate-video-r2v`

Generate a video with character consistency from 1-9 reference images using HappyHorse 1.1 R2V. Reference subjects using `[Image 1]`, `[Image 2]` in the prompt.

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string | **required** | Description using `[Image 1]`, `[Image 2]` to reference images |
| `images` | string[] | **required** | 1-9 reference image URLs. Order = `[Image 1]`, `[Image 2]`... |
| `output` | string | **required** | Absolute path to save the video |
| `duration` | number | `5` | Seconds. Range: 3-15 |
| `resolution` | string | `"720P"` | `"720P"` or `"1080P"` |
| `ratio` | string | `"16:9"` | Aspect ratio |
| `seed` | number | — | Seed for reproducible results |

---

## How it works

```
OpenCode ──▶ Custom Tool (.opencode/tools/) ──▶ Qwen Token Plan API
                      │
                      ├── shared.ts (auth, download)
                      │
                      └── Wan 2.7 Image / HappyHorse 1.1
```

All tools share `shared.ts` for authentication (reads `sk-sp-...` from OpenCode's auth store or config), API routing (Token Plan domain), and file download. Image gen is synchronous. Video gen is async — submit task, poll every 3s until done, then download.

## Important notes

- **No watermark** — `watermark: false` is hardcoded. Outputs are clean.
- **Token Plan domain only** — Uses `token-plan.ap-southeast-1.maas.aliyuncs.com`. Pay-as-you-go keys and `dashscope-intl` will not work.
- **Credits** — Image gen deducts credits per image. Video gen deducts per second of output. Billed through your Token Plan.
- **Video polling** — Polls every 3s with a 120s timeout.
- **URL expiry** — Generated URLs expire in 24 hours. Tools download immediately so the local file is permanent.
- **Minimum resolution** — 768×768 pixels. Use `width`/`height` for custom sizes.

## License

MIT
