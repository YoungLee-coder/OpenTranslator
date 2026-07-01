import type {
  ProviderField,
  ProviderType,
} from "@opentranslator/shared-types";

// Drives the dynamic provider form in the Dashboard.
// Add a vendor here + an adapter file = new provider, no core logic changes.
export const providerSchemas: Record<ProviderType, ProviderField[]> = {
  openai: [
    { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.openai.com/v1" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "gpt-4o-mini" },
  ],
  claude: [
    { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.anthropic.com" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "claude-sonnet-4-5" },
  ],
  gemini: [
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "gemini-2.0-flash" },
  ],
  deepseek: [
    { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.deepseek.com" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "deepseek-chat" },
  ],
  openrouter: [
    { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://openrouter.ai/api/v1" },
    { key: "defaultModel", label: "Default Model", type: "text", placeholder: "openrouter/auto" },
  ],
  azure_openai: [
    { key: "baseUrl", label: "Endpoint", type: "text", required: true },
    { key: "defaultModel", label: "Deployment", type: "text", required: true },
  ],
  custom: [
    { key: "baseUrl", label: "Base URL", type: "text", required: true },
    { key: "defaultModel", label: "Default Model", type: "text" },
  ],
};
