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
  deepl: [
    {
      key: "plan",
      label: "套餐",
      type: "select",
      defaultValue: "pro",
      options: [
        { value: "pro", label: "Pro（专业版）" },
        { value: "free", label: "Free（免费版）" },
      ],
    },
    {
      key: "models",
      label: "模型",
      type: "select",
      defaultValue: "prefer_quality_optimized",
      options: [
        { value: "prefer_quality_optimized", label: "偏好质量优化（推荐）" },
        { value: "quality_optimized", label: "质量优化" },
        { value: "latency_optimized", label: "延迟优化" },
      ],
    },
    {
      key: "formality",
      label: "正式度",
      type: "select",
      defaultValue: "default",
      options: [
        { value: "default", label: "默认" },
        { value: "prefer_more", label: "偏正式" },
        { value: "prefer_less", label: "偏非正式" },
      ],
    },
  ],
  custom: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://your-endpoint/v1/chat/completions" },
    { key: "models", label: "模型", type: "models" },
  ],
};

/** select 型 models 字段的 value → 展示 label；无映射时回落到原始 model 值。 */
export function resolveModelLabel(type: ProviderType, model: string): string {
  const modelsField = providerSchemas[type]?.find((f) => f.key === "models");
  if (modelsField?.type !== "select" || !modelsField.options) {
    return model;
  }
  for (const opt of modelsField.options) {
    if (typeof opt === "string") {
      if (opt === model) return opt;
    } else if (opt.value === model) {
      return opt.label ?? opt.value;
    }
  }
  return model;
}
