# mmx-mcp-server

一个统一的 MiniMax 全模态 MCP Server，基于 `mmx` CLI 封装，支持文本、搜索、图像理解、图像生成、语音合成、视频生成、音乐生成和配额查询。

> [English README](README_EN.md)

## 快速开始（一句话配置）

如果你使用的是 Claude Code、OpenCode 或其他支持 MCP 的 AI CLI 工具，直接把下面这段话丢给 AI：

> 帮我安装并配置 mmx-mcp-server：
> 1. 全局安装 mmx-cli（`npm install -g mmx-cli`）
> 2. 克隆 https://github.com/YOUR_USERNAME/mmx-mcp-server 到任意目录，执行 `npm install && npm run build`
> 3. 在我的 MCP 配置文件（如 `~/.claude/settings.json`）里添加 `mmx` server，指向构建产物 `dist/index.js`
> 4. 向我要 MiniMax API Key，并通过 `env.MINIMAX_API_KEY` 注入
> 5. 完成后告诉我配置结果

---

## 手动安装

### 1. 安装 mmx CLI（如果尚未安装）

```bash
npm install -g mmx-cli
```

验证安装：

```bash
mmx --version
```

### 2. 安装并构建 MCP Server

```bash
git clone https://github.com/zth0828/mmx-mcp-server.git
cd mmx-mcp-server
npm install
npm run build
```

### 3. 配置 API Key

在 MCP 客户端配置（如 `~/.claude/settings.json`）中添加：

#### 方式一：环境变量传 API Key（推荐）

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

#### 方式二：命令行参数传 API Key

适合不方便写 `env` 的 MCP 客户端：

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

#### 方式三：依赖 `mmx` CLI 本地登录

如果前两种方式都没配，Server 会自动回退到 `mmx` CLI 自身的认证状态（需提前执行 `mmx auth login --api-key sk-xxxxx`）。这种方式仅适合本机使用。

---

### 自定义输出目录（可选）

默认情况下，生成的图片、视频、音乐、语音会自动保存到 **当前工作目录** 下的子文件夹：

- `mmx_image/` — 图片
- `mmx_video/` — 视频
- `mmx_music/` — 音乐
- `mmx_speech/` — 语音

如果你希望统一放到其他位置，可以通过环境变量 `MMX_OUTPUT_DIR` 修改：

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

> 不配置 `MMX_OUTPUT_DIR` 也完全不影响使用，文件会自动落在当前项目目录下。

每次调用时也可以通过 `out` 参数指定单个文件的输出路径。

## 提供的 Tools

| Tool | 说明 |
|------|------|
| `mmx_search` | 网页搜索 |
| `mmx_vision_describe` | 图像理解（支持自定义分析指令，如 UI critique） |
| `mmx_text_chat` | 文本对话（支持 system prompt、JSON 模式） |
| `mmx_image_generate` | 图像生成（支持 `out` 指定路径） |
| `mmx_speech_synthesize` | 语音合成 TTS（支持 `out` 指定路径） |
| `mmx_video_generate` | 视频生成（支持 `out` 指定路径） |
| `mmx_music_generate` | 音乐生成（支持 `out` 指定路径） |
| `mmx_quota_show` | 查看配额 |

## 使用示例

配置完成后，你可以在 Claude Code 中直接说：

> "帮我搜索 MiniMax 的最新新闻"  
> "分析一下这个 UI 设计图，给出优化建议"  
> "生成一张赛博朋克风格的城市夜景图"  
> "把这段文字转成语音"
