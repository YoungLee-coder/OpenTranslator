import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { safeText } from "./sse";

/**
 * DeepL API (POST /v2/translate) 适配器。DeepL 是专用翻译引擎而非 LLM，
 * 因此不走 buildPrompt —— 直接传 text / source_lang / target_lang。
 *
 * 与 LLM 供应商的差异：
 *  - 鉴权用 `DeepL-Auth-Key <api-key>`（非 Bearer）。
 *  - 不支持流式：省略 translateStream，路由层自动回落到非流式 JSON。
 *  - 不支持自定义提示词 / AI 专家模式（DeepL API 固定格式），
 *    req.expertId 在此被忽略。
 *  - 语言码大写（EN/ZH/DE…），项目内部小写，需映射；auto → 省略 source_lang
 *    触发 DeepL 自动检测。
 *
 * 配置：
 *  - configJson.plan：`pro` | `free`，决定 baseUrl（默认 pro）。
 *  - configJson.formality：`default` | `prefer_more` | `prefer_less` | `more` |
 *    `less`，留空走 DeepL 默认。为不支持 formality 的语种安全，建议 prefer_*。
 *  - models 字段复用为 model_type 选择（quality_optimized /
 *    prefer_quality_optimized / latency_optimized），首项为默认。
 */

interface DeepLTranslation {
  detected_source_language?: string;
  text?: string;
  billed_characters?: number;
}
interface DeepLResponse {
  translations?: DeepLTranslation[];
}

const PRO_BASE = "https://api.deepl.com";
const FREE_BASE = "https://api-free.deepl.com";
const DEFAULT_MODEL_TYPE = "prefer_quality_optimized";

/** 项目小写码 → DeepL 大写码；auto/空 → undefined（省略 source_lang 触发自动检测）。 */
function deeplLang(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (code === "auto") return undefined;
  if (code === "zh-CN") return "ZH-HANS";
  if (code === "zh-TW" || code === "zh-HK") return "ZH-HANT";
  return code.toUpperCase();
}

/** DeepL 返回的 detected_source_language → 项目内部语言码。 */
function fromDeepLDetected(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase();
  if (lower === "zh" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-hant") return "zh-TW";
  return lower;
}

function baseOf(ctx: ProviderContext): string {
  const plan =
    typeof ctx.configJson?.plan === "string"
      ? ctx.configJson.plan.trim().toLowerCase()
      : "";
  return (plan === "free" ? FREE_BASE : PRO_BASE).replace(/\/$/, "");
}

function headers(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `DeepL-Auth-Key ${apiKey}`,
  };
}

function buildBody(
  req: TranslateRequest,
  ctx: ProviderContext,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    text: [req.text],
    target_lang: deeplLang(req.targetLang) ?? "",
    // 保留原文格式（换行、标点风格），与项目"保持原文格式"约定一致
    preserve_formatting: true,
    show_billed_characters: true,
  };
  const src = deeplLang(req.sourceLang);
  if (src) body.source_lang = src;
  const modelType = (ctx.defaultModel?.trim() || DEFAULT_MODEL_TYPE).toLowerCase();
  if (modelType) body.model_type = modelType;
  const formality =
    typeof ctx.configJson?.formality === "string"
      ? ctx.configJson.formality.trim().toLowerCase()
      : "";
  if (formality && formality !== "default") body.formality = formality;
  // Long-text chunk continuity: surrounding source (not billed by DeepL).
  const ctxTail = req.previousContext?.sourceTail?.trim();
  if (ctxTail) body.context = ctxTail;
  return body;
}

export const deeplProvider: TranslationProvider = {
  name: "deepl",
  async translate(req, ctx): Promise<TranslateResponse> {
    const url = `${baseOf(ctx)}/v2/translate`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(ctx.apiKey),
      body: JSON.stringify(buildBody(req, ctx)),
    });
    if (!res.ok) throw new Error(`deepl: ${res.status} ${await safeText(res)}`);
    const data = (await res.json()) as DeepLResponse;
    const t = data.translations?.[0];
    const text = t?.text ?? "";
    return {
      translatedText: text,
      // DeepL 返回大写码（如 "EN" / "ZH-HANS"），归一到项目内部语言码
      detectedSourceLang: fromDeepLDetected(t?.detected_source_language),
      provider: "deepl",
      // DeepL 按字符计费，没有 token 概念；用 billed_characters 近似 inputTokens
      usage:
        typeof t?.billed_characters === "number"
          ? { inputTokens: t.billed_characters, outputTokens: 0 }
          : undefined,
    };
  },
  // DeepL 不支持流式：省略 translateStream，路由层自动回落到非流式 JSON。
};
