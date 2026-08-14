import type { ProviderContext, ProviderType } from "@opentranslator/shared-types";

/**
 * OpenAI-compatible 请求体上关闭推理 / 思考链的额外字段。
 *
 * - openai / aihubmix：统一传 `reasoning_effort: "none"`
 *   （aihubmix 统一推理规范推荐值）
 * - cloudflare 等：再附带常见 hybrid thinking 开关，兼容部分 Workers AI 模型
 *
 * @see https://docs.aihubmix.com/cn/api/unified-inference
 */
export function openAICompatDisableReasoning(
  ctx: ProviderContext,
  provider: ProviderType,
): Record<string, unknown> {
  if (!ctx.disableModelReasoning) return {};
  if (provider === "openai" || provider === "aihubmix") {
    return { reasoning_effort: "none" };
  }
  return {
    reasoning_effort: "none",
    thinking: { type: "disabled" },
    chat_template_kwargs: { enable_thinking: false },
  };
}

/** OpenRouter 原生 `reasoning.effort`（@openrouter/sdk ChatRequest）。 */
export function openrouterDisableReasoning(
  ctx: ProviderContext,
): { reasoning: { effort: "none" } } | Record<string, never> {
  if (!ctx.disableModelReasoning) return {};
  return { reasoning: { effort: "none" } };
}

/** Anthropic Messages：显式关闭 extended / adaptive thinking。 */
export function claudeDisableReasoning(
  ctx: ProviderContext,
): { thinking: { type: "disabled" } } | Record<string, never> {
  if (!ctx.disableModelReasoning) return {};
  return { thinking: { type: "disabled" } };
}

/** Gemini generateContent config：thinkingBudget 0 = 关闭思考。 */
export function geminiDisableReasoningConfig(
  ctx: ProviderContext,
): { thinkingConfig: { thinkingBudget: 0 } } | Record<string, never> {
  if (!ctx.disableModelReasoning) return {};
  return { thinkingConfig: { thinkingBudget: 0 } };
}
