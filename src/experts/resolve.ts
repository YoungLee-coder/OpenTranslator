import type { TranslateRequest } from "@opentranslator/shared-types";
import type { AiExpertDefinition, AiExpertLangOverride, ResolvedExpertPrompts } from "./types";
import { langDisplayName, langOverrideId } from "./lang";

function applyLangOverride(
  expert: AiExpertDefinition,
  sourceLang: string,
  targetLang: string,
): AiExpertLangOverride | undefined {
  const id = langOverrideId(sourceLang, targetLang);
  return expert.langOverrides.find((o) => o.id === id);
}

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(val);
  }
  // IT placeholders we don't support yet — strip to avoid leaking raw tokens.
  out = out.replace(/\{\{title_prompt\}\}/g, "");
  out = out.replace(/\{\{summary_prompt\}\}/g, "");
  out = out.replace(/\{\{terms_prompt\}\}/g, "");
  return out;
}

function buildYamlBlock(expert: AiExpertDefinition, text: string): string {
  const env = expert.env;
  const sourceField = env.imt_source_field ?? "text";
  return `- id: 1\n  ${sourceField}: ${escapeYamlScalar(text)}`;
}

/** Always quote text embedded as a YAML scalar value. */
function escapeYamlScalar(text: string): string {
  return JSON.stringify(text);
}

function buildEnvVars(
  expert: AiExpertDefinition,
  req: TranslateRequest,
): Record<string, string> {
  const to = langDisplayName(req.targetLang);
  const from =
    req.sourceLang === "auto" || !req.sourceLang
      ? langDisplayName("auto")
      : langDisplayName(req.sourceLang);
  const yaml = buildYamlBlock(expert, req.text);
  const vars: Record<string, string> = {
    to,
    from,
    yaml,
    text: req.text,
    id: "1",
  };
  for (const [k, v] of Object.entries(expert.env)) {
    vars[k] = substitute(v, vars);
  }
  if (expert.env.normal_result_yaml_example) {
    vars.normal_result_yaml_example = substitute(expert.env.normal_result_yaml_example, vars);
  }
  if (expert.env.subtitle_result_yaml_example) {
    vars.subtitle_result_yaml_example = substitute(expert.env.subtitle_result_yaml_example, vars);
  }
  return vars;
}

/**
 * Resolve Immersive Translate expert YAML into OpenAI-style system + user prompts.
 * Single-paragraph mode: uses `prompt` or `multiplePrompt` with a one-item YAML block.
 */
export function resolveExpertPrompts(
  expert: AiExpertDefinition,
  req: TranslateRequest,
): ResolvedExpertPrompts {
  const override = applyLangOverride(expert, req.sourceLang, req.targetLang);
  const vars = buildEnvVars(expert, req);

  const systemRaw =
    override?.systemPrompt ??
    expert.systemPrompt ??
    override?.multipleSystemPrompt ??
    expert.multipleSystemPrompt ??
    `You are a professional translator. Translate text into ${vars.to}. Output ONLY the translation.`;

  const userTemplate = pickUserTemplate(expert, override);

  const system = substitute(systemRaw, vars);

  // Newer IT experts (1.17.2+) use plain-text system prompts; skip legacy YAML
  // multiplePrompt when a direct text path is available.
  const prefersPlainText =
    !override?.prompt &&
    !expert.prompt &&
    systemRaw.includes("Output only the translated content");

  if (userTemplate && !prefersPlainText) {
    const user = substitute(userTemplate, vars);
    const transField = expert.env.imt_trans_field ?? "text";
    const outputField = transField === "text" && expert.env.imt_source_field === "source"
      ? "step2"
      : transField;
    return {
      system,
      user,
      outputField,
      usesYamlOutput: user.includes("{{yaml}}") || user.includes("YAML"),
    };
  }

  // Experts with only systemPrompt: pass source text directly.
  return {
    system,
    user: req.text,
    usesYamlOutput: false,
  };
}

function pickUserTemplate(
  expert: AiExpertDefinition,
  override: AiExpertLangOverride | undefined,
): string | undefined {
  return (
    override?.prompt ??
    expert.prompt ??
    override?.multiplePrompt ??
    expert.multiplePrompt
  );
}
