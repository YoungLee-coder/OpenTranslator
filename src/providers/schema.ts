import type {
  ProviderField,
  ProviderType,
} from "@opentranslator/shared-types";

// Drives the dynamic provider form in the Dashboard.
// Add a vendor here + an adapter file = new provider, no core logic changes.
// baseUrl 填写完整端点 URL（OpenAI 兼容含 /chat/completions，Claude 含
// /v1/messages），需以 http(s):// 开头，adapter 不再拼接路径；
// preset 字段（如 aihubmix）由 schema 锁定为完整预设值，前端不可编辑。
export const providerSchemas: Record<ProviderType, ProviderField[]> = {
  openai: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://api.openai.com/v1/chat/completions" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "gpt-4o-mini" },
  ],
  claude: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://api.anthropic.com/v1/messages" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "claude-sonnet-4-5" },
  ],
  gemini: [
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "gemini-2.0-flash" },
  ],
  aihubmix: [
    { key: "baseUrl", label: "Base URL", type: "text", preset: "https://aihubmix.com/v1/chat/completions" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "gpt-4o-mini" },
  ],
  custom: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://your-endpoint/v1/chat/completions" },
    { key: "defaultModel", label: "Default Model", type: "text" },
  ],
};
