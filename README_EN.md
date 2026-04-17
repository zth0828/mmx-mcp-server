# mmx-mcp-server

A unified Model Context Protocol (MCP) server for MiniMax, wrapping the `mmx` CLI. Supports text chat, web search, vision understanding, image generation, speech synthesis, video generation, music generation, and quota queries.

> [中文 README](README.md)

## Quick Start (One-sentence setup)

If you are using Claude Code, OpenCode, or any other AI CLI tool that supports MCP, simply paste the following prompt to your assistant:

> Please install and configure mmx-mcp-server for me:
> 1. Globally install mmx-cli (`npm install -g mmx-cli`)
> 2. Clone https://github.com/YOUR_USERNAME/mmx-mcp-server to any directory and run `npm install && npm run build`
> 3. Add an `mmx` server entry to my MCP config file (e.g. `~/.claude/settings.json`) pointing to the built artifact `dist/index.js`
> 4. Ask me for my MiniMax API Key and inject it via `env.MINIMAX_API_KEY`
> 5. Tell me the result when done

---

## Manual Installation

### 1. Install mmx CLI (if not already installed)

```bash
npm install -g mmx-cli
```

Verify installation:

```bash
mmx --version
```

### 2. Install and build the MCP Server

```bash
git clone https://github.com/zth0828/mmx-mcp-server.git
cd mmx-mcp-server
npm install
npm run build
```

### 3. Configure the API Key

Add the following to your MCP client settings (e.g. `~/.claude/settings.json` under `mcpServers`):

#### Option 1: API Key via Environment Variable (Recommended)

```json
{
  "mcpServers": {
    "mmx": {
      "command": "node",
      "args": ["/path/to/mmx-mcp-server/dist/index.js"],
      "env": {
        "MINIMAX_API_KEY": "sk-xxxxx"
      }
    }
  }
}
```

#### Option 2: API Key via Command-Line Arguments

Useful for MCP clients that do not support `env`:

```json
{
  "mcpServers": {
    "mmx": {
      "command": "node",
      "args": [
        "/path/to/mmx-mcp-server/dist/index.js",
        "--api-key",
        "sk-xxxxx"
      ]
    }
  }
}
```

#### Option 3: Fallback to `mmx` CLI Local Auth

If no API key is provided via MCP config, the server falls back to the `mmx` CLI's own authentication state (requires prior `mmx auth login --api-key sk-xxxxx`). This is only suitable for local usage.

---

### Custom Output Directory (Optional)

By default, generated images, videos, music, and speech are saved into subdirectories under the **current working directory**:

- `mmx_image/` — Images
- `mmx_video/` — Videos
- `mmx_music/` — Music
- `mmx_speech/` — Speech

You can change the base output directory with the `MMX_OUTPUT_DIR` environment variable:

```json
{
  "mcpServers": {
    "mmx": {
      "command": "node",
      "args": ["/path/to/mmx-mcp-server/dist/index.js"],
      "env": {
        "MINIMAX_API_KEY": "sk-xxxxx",
        "MMX_OUTPUT_DIR": "/Users/xxx/Downloads/mmx-output"
      }
    }
  }
}
```

> Not setting `MMX_OUTPUT_DIR` is perfectly fine — files will simply land under your current project directory.

You can also specify an individual output path on each tool call via the `out` parameter.

## Available Tools

| Tool | Description |
|------|-------------|
| `mmx_search` | Web search |
| `mmx_vision_describe` | Image understanding with custom instructions (e.g. UI critique) |
| `mmx_text_chat` | Text chat (supports system prompt & JSON mode) |
| `mmx_image_generate` | Image generation (supports `out` path) |
| `mmx_speech_synthesize` | Text-to-speech (supports `out` path) |
| `mmx_video_generate` | Video generation (supports `out` path) |
| `mmx_music_generate` | Music generation (supports `out` path) |
| `mmx_quota_show` | Show usage quotas |

## Usage Examples

Once configured, you can ask your AI assistant directly:

> "Search for the latest MiniMax news"  
> "Analyze this UI screenshot and give me improvement suggestions"  
> "Generate a cyberpunk city nightscape image"  
> "Turn this paragraph into speech"
