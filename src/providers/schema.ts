import type {
  ProviderField,
  ProviderType,
} from "@opentranslator/shared-types";

// Drives the dynamic provider form in the Dashboard.
// Add a vendor here + an adapter file = new provider, no core logic changes.
// baseUrl 填写完整端点 URL（OpenAI 兼容含 /chat/completions，Claude 含
// /v1/messages），需以 http(s):// 开头，adapter 不再拼接路径；
// preset 字段（如 aihubmix）由 schema 锁定为完整预设值，前端不可编辑。
// models 字段一行一个模型名，首项视为该供应商的默认模型。
export const providerSchemas: Record<ProviderType, ProviderField[]> = {
  openai: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://api.openai.com/v1/chat/completions" },
    { key: "models", label: "模型", type: "models", placeholder: "gpt-4o-mini\ngpt-4o" },
  ],
  claude: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://api.anthropic.com/v1/messages" },
    { key: "models", label: "模型", type: "models", placeholder: "claude-sonnet-4-5\nclaude-opus-4-1" },
  ],
  gemini: [
    { key: "models", label: "模型", type: "models", placeholder: "gemini-2.0-flash\ngemini-2.5-pro" },
  ],
  aihubmix: [
    { key: "baseUrl", label: "Base URL", type: "text", preset: "https://aihubmix.com/v1/chat/completions" },
    { key: "models", label: "模型", type: "models", placeholder: "gpt-4o-mini\ngpt-4o" },
  ],
  cloudflare: [
    { key: "accountId", label: "Account ID", type: "text", required: true, placeholder: "Cloudflare 账户 ID（Dashboard 右侧栏可见）" },
    { key: "models", label: "模型", type: "models", placeholder: "@cf/google/gemma-4-26b-a4b-it\n@cf/meta/llama-3.1-8b-instruct" },
  ],
  custom: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://your-endpoint/v1/chat/completions" },
    { key: "models", label: "模型", type: "models" },
  ],
};
