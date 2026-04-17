#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, execSync } from "child_process";
import { mkdir, mkdtemp, readdir } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

const COMMON_ARGS = ["--output", "json", "--non-interactive", "--quiet"];

const argsIndex = process.argv.indexOf("--api-key");
const API_KEY =
  argsIndex !== -1
    ? process.argv[argsIndex + 1]
    : process.env.MINIMAX_API_KEY || process.env.MCP_MINIMAX_API_KEY || undefined;

const API_KEY_ARGS = API_KEY ? ["--api-key", API_KEY] : [];

const DEFAULT_OUTPUT_BASE = process.env.MMX_OUTPUT_DIR || process.cwd();

const TOOL_OUTPUT_SUBDIR: Record<string, string> = {
  mmx_image_generate: "mmx_image",
  mmx_video_generate: "mmx_video",
  mmx_music_generate: "mmx_music",
  mmx_speech_synthesize: "mmx_speech",
};

function getDefaultOutputDir(toolName: string): string {
  const subdir = TOOL_OUTPUT_SUBDIR[toolName] || "mmx_output";
  return resolve(DEFAULT_OUTPUT_BASE, subdir);
}

async function runMmx(
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((res, rej) => {
    const child = spawn("mmx", [...API_KEY_ARGS, ...COMMON_ARGS, ...args], {
      cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });
    child.on("close", (code) => {
      res({ stdout, stderr, exitCode: code ?? 0 });
    });
    child.on("error", rej);
  });
}

async function runMmxWithFiles(args: string[], outputDir?: string) {
  const dir = outputDir || (await mkdtemp(join(tmpdir(), "mmx-mcp-")));
  if (outputDir) {
    await mkdir(outputDir, { recursive: true });
  }
  const result = await runMmx(args, dir);
  const files = (await readdir(dir)).map((f) => join(dir, f));
  return { ...result, files, tempDir: dir };
}

function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const server = new Server(
  {
    name: "mmx-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mmx_search",
        description:
          "Search the web using MiniMax. Returns search results with titles, snippets, and URLs. Use this when you need up-to-date information, facts, news, or references from the internet.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query. Be specific for better results.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "mmx_vision_describe",
        description:
          "Analyze an image with a custom instruction using MiniMax Vision. Useful for: UI/UX critique, extracting text, identifying objects, evaluating designs, or answering specific questions about the image.",
        inputSchema: {
          type: "object",
          properties: {
            image: {
              type: "string",
              description:
                "Local file path or URL to the image. Base64 encoding is handled automatically.",
            },
            prompt: {
              type: "string",
              description:
                "Instruction or question about the image. Examples: 'Give me UX improvement suggestions for this UI', 'Extract all visible text', 'What is wrong with this layout?', 'Describe the image in detail'. Defaults to 'Describe the image.'",
            },
          },
          required: ["image"],
        },
      },
      {
        name: "mmx_text_chat",
        description:
          "Chat with MiniMax text models. Supports system prompts and optional JSON mode. Use this for general reasoning, writing, coding help, or structured output.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The user message to send to the model",
            },
            system: {
              type: "string",
              description:
                "Optional system prompt to set the model's behavior or persona",
            },
            json: {
              type: "boolean",
              description:
                "If true, requests the model to output valid JSON. You should still explicitly ask for JSON in the message or system prompt.",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "mmx_image_generate",
        description:
          "Generate images with MiniMax. If no output path is provided, images are saved to the default output directory (e.g. ./mmx_image) and their file paths are returned.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Detailed description of the image you want to generate",
            },
            aspect_ratio: {
              type: "string",
              description:
                "Optional aspect ratio. Supported: 16:9, 1:1, 4:3. Default: 1:1",
            },
            n: {
              type: "number",
              description:
                "Optional number of images to generate. Default: 1",
            },
            out: {
              type: "string",
              description:
                "Optional custom output file path or directory. If omitted, uses the default directory",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "mmx_speech_synthesize",
        description:
          "Synthesize speech with MiniMax TTS. Converts text into an audio file. If no output path is provided, the file is saved to the default output directory (e.g. ./mmx_speech).",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to convert to speech",
            },
            voice: {
              type: "string",
              description: "Optional voice ID. Default depends on the model",
            },
            speed: {
              type: "number",
              description: "Optional speech speed multiplier (e.g. 0.8 - 1.5)",
            },
            out: {
              type: "string",
              description:
                "Optional output file path. If omitted, a temp file path is returned",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "mmx_video_generate",
        description:
          "Generate video with MiniMax from a text prompt. If no output path is provided, the video is saved to the default output directory (e.g. ./mmx_video) and its file path is returned.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Detailed description of the video scene you want to generate",
            },
            duration: {
              type: "number",
              description:
                "Optional duration in seconds. Check model limits for max duration",
            },
            resolution: {
              type: "string",
              description: "Optional resolution. Example: 768p",
            },
            out: {
              type: "string",
              description:
                "Optional custom output file path. If omitted, uses the default directory",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "mmx_music_generate",
        description:
          "Generate music with MiniMax. Supports instrumental or vocal music. If lyrics and style are provided, generates a song. If no output path is provided, the audio file is saved to the default output directory (e.g. ./mmx_music).",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Description of the music you want (mood, genre, instruments, scene)",
            },
            lyrics: {
              type: "string",
              description:
                "Optional lyrics content. If provided, the model will attempt to generate a vocal track",
            },
            style: {
              type: "string",
              description:
                "Optional music style or genre hint (e.g. 'pop', 'classical piano', 'electronic')",
            },
            out: {
              type: "string",
              description:
                "Optional output file path. If omitted, a temp file path is returned",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "mmx_quota_show",
        description:
          "Show MiniMax usage quotas and remaining limits for each model or service.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "mmx_search": {
        const { query } = args as { query: string };
        const { stdout, stderr, exitCode } = await runMmx([
          "search",
          "query",
          query,
        ]);
        return {
          content: [
            {
              type: "text",
              text:
                exitCode === 0
                  ? JSON.stringify(parseJsonSafe(stdout), null, 2)
                  : stderr || stdout || `Exit code: ${exitCode}`,
            },
          ],
        };
      }

      case "mmx_vision_describe": {
        const { image, prompt } = args as { image: string; prompt?: string };
        const cmdArgs = ["vision", "describe", "--image", image];
        if (prompt) cmdArgs.push("--prompt", prompt);
        const { stdout, stderr, exitCode } = await runMmx(cmdArgs);
        return {
          content: [
            {
              type: "text",
              text:
                exitCode === 0
                  ? JSON.stringify(parseJsonSafe(stdout), null, 2)
                  : stderr || stdout || `Exit code: ${exitCode}`,
            },
          ],
        };
      }

      case "mmx_text_chat": {
        const { message, system, json } = args as {
          message: string;
          system?: string;
          json?: boolean;
        };
        const cmdArgs = ["text", "chat", "--message", message];
        if (system) cmdArgs.push("--system", system);
        if (json) cmdArgs.push("--json");
        const { stdout, stderr, exitCode } = await runMmx(cmdArgs);
        return {
          content: [
            {
              type: "text",
              text:
                exitCode === 0
                  ? JSON.stringify(parseJsonSafe(stdout), null, 2)
                  : stderr || stdout || `Exit code: ${exitCode}`,
            },
          ],
        };
      }

      case "mmx_quota_show": {
        const { stdout, stderr, exitCode } = await runMmx(["quota", "show"]);
        if (exitCode !== 0) {
          return {
            content: [
              {
                type: "text",
                text: stderr || stdout || `Exit code: ${exitCode}`,
              },
            ],
          };
        }
        const data = parseJsonSafe(stdout);
        if (typeof data === "string") {
          return {
            content: [{ type: "text", text: data }],
          };
        }
        const remains = data?.model_remains || [];
        const lines: string[] = [];
        lines.push("MiniMax TokenPlan 配额面板");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        for (const item of remains) {
          const total = item.current_interval_total_count ?? 0;
          // API 的 usage_count 实际是剩余次数（字段名有误）
          const remaining = item.current_interval_usage_count ?? 0;
          const used = total - remaining;
          const name: string = item.model_name ?? "Unknown";
          lines.push(`${name.padEnd(36)} ${used} / ${total}`);
        }
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        lines.push("注：X / Y 中 X 为已使用次数，Y 为周期总额度");
        return {
          content: [
            {
              type: "text",
              text: lines.join("\n"),
            },
          ],
        };
      }

      case "mmx_image_generate": {
        const { prompt, aspect_ratio, n, out } = args as {
          prompt: string;
          aspect_ratio?: string;
          n?: number;
          out?: string;
        };
        const cmdArgs = ["image", prompt];
        if (aspect_ratio) cmdArgs.push("--aspect-ratio", aspect_ratio);
        if (n !== undefined) cmdArgs.push("--n", String(n));
        const outputDir = out ? undefined : getDefaultOutputDir("mmx_image_generate");
        const { stdout, stderr, exitCode, files } = await runMmxWithFiles(
          cmdArgs,
          outputDir
        );
        const data = parseJsonSafe(stdout);
        const textParts: string[] = [];
        if (exitCode !== 0) {
          textParts.push(stderr || stdout || `Exit code: ${exitCode}`);
        } else {
          textParts.push(JSON.stringify(data, null, 2));
        }
        const outputFiles = out ? [resolve(out)] : files;
        if (outputFiles.length > 0) {
          textParts.push("\nGenerated files:");
          outputFiles.forEach((f) => textParts.push(`- ${f}`));
        }
        return {
          content: [
            {
              type: "text",
              text: textParts.join("\n"),
            },
          ],
        };
      }

      case "mmx_speech_synthesize": {
        const { text, voice, speed, out } = args as {
          text: string;
          voice?: string;
          speed?: number;
          out?: string;
        };
        const cmdArgs = ["speech", "synthesize", "--text", text];
        if (voice) cmdArgs.push("--voice", voice);
        if (speed !== undefined) cmdArgs.push("--speed", String(speed));
        if (out) cmdArgs.push("--out", resolve(out));
        const outputDir = out
          ? undefined
          : getDefaultOutputDir("mmx_speech_synthesize");
        const { stdout, stderr, exitCode, files } = await runMmxWithFiles(
          cmdArgs,
          outputDir
        );
        const data = parseJsonSafe(stdout);
        const textParts: string[] = [];
        if (exitCode !== 0) {
          textParts.push(stderr || stdout || `Exit code: ${exitCode}`);
        } else {
          textParts.push(JSON.stringify(data, null, 2));
        }
        const outputFiles = out ? [resolve(out)] : files;
        if (outputFiles.length > 0) {
          textParts.push("\nGenerated files:");
          outputFiles.forEach((f) => textParts.push(`- ${f}`));
        }
        return {
          content: [
            {
              type: "text",
              text: textParts.join("\n"),
            },
          ],
        };
      }

      case "mmx_video_generate": {
        const { prompt, duration, resolution, out } = args as {
          prompt: string;
          duration?: number;
          resolution?: string;
          out?: string;
        };
        const cmdArgs = ["video", "generate", "--prompt", prompt];
        if (duration !== undefined) cmdArgs.push("--duration", String(duration));
        if (resolution) cmdArgs.push("--resolution", resolution);
        if (out) cmdArgs.push("--out", resolve(out));
        const outputDir = out
          ? undefined
          : getDefaultOutputDir("mmx_video_generate");
        const { stdout, stderr, exitCode, files } = await runMmxWithFiles(
          cmdArgs,
          outputDir
        );
        const data = parseJsonSafe(stdout);
        const textParts: string[] = [];
        if (exitCode !== 0) {
          textParts.push(stderr || stdout || `Exit code: ${exitCode}`);
        } else {
          textParts.push(JSON.stringify(data, null, 2));
        }
        const outputFiles = out ? [resolve(out)] : files;
        if (outputFiles.length > 0) {
          textParts.push("\nGenerated files:");
          outputFiles.forEach((f) => textParts.push(`- ${f}`));
        }
        return {
          content: [
            {
              type: "text",
              text: textParts.join("\n"),
            },
          ],
        };
      }

      case "mmx_music_generate": {
        const { prompt, lyrics, style, out } = args as {
          prompt: string;
          lyrics?: string;
          style?: string;
          out?: string;
        };
        const cmdArgs = ["music", "generate", "--prompt", prompt];
        if (lyrics) cmdArgs.push("--lyrics", lyrics);
        if (style) cmdArgs.push("--style", style);
        if (out) cmdArgs.push("--out", resolve(out));
        const outputDir = out
          ? undefined
          : getDefaultOutputDir("mmx_music_generate");
        const { stdout, stderr, exitCode, files } = await runMmxWithFiles(
          cmdArgs,
          outputDir
        );
        const data = parseJsonSafe(stdout);
        const textParts: string[] = [];
        if (exitCode !== 0) {
          textParts.push(stderr || stdout || `Exit code: ${exitCode}`);
        } else {
          textParts.push(JSON.stringify(data, null, 2));
        }
        const outputFiles = out ? [resolve(out)] : files;
        if (outputFiles.length > 0) {
          textParts.push("\nGenerated files:");
          outputFiles.forEach((f) => textParts.push(`- ${f}`));
        }
        return {
          content: [
            {
              type: "text",
              text: textParts.join("\n"),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err.message || String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

function ensureMmxCli() {
  try {
    execSync("mmx --version", { stdio: "ignore" });
  } catch {
    console.error(
      "Error: mmx CLI not found. Please install it first: npm install -g mmx-cli"
    );
    process.exit(1);
  }
}

function handleCliArgs() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`mmx-mcp-server v1.0.0

A unified MCP server for MiniMax CLI (mmx).

Usage:
  node dist/index.js [options]

Options:
  --api-key <key>    Pass MiniMax API key via command line
  --help, -h         Show this help message
  --version          Show version number

Environment Variables:
  MINIMAX_API_KEY      MiniMax API key (recommended)
  MCP_MINIMAX_API_KEY  Alternative API key variable
  MMX_OUTPUT_DIR       Base directory for generated files
`);
    process.exit(0);
  }

  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log("1.0.0");
    process.exit(0);
  }
}

async function main() {
  handleCliArgs();
  ensureMmxCli();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
