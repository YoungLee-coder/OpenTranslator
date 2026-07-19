import type { TranslateRequest } from "@opentranslator/shared-types";
import { langDisplayName } from "./lang";
import { extractExpertTranslation } from "./parse-response";
import { getExpert, isGeneralExpert } from "./registry";
import { resolveExpertPrompts } from "./resolve";

export interface BuiltPrompt {
  system: string;
  user: string;
  /** Post-process model output when an expert uses YAML response format. */
  postProcess?: (raw: string) => string;
}

/**
 * Build translation prompts — either from an IT AI expert or the generic default.
 */
export function buildTranslationPrompt(req: TranslateRequest): BuiltPrompt {
  const id = req.expertId;
  let built: BuiltPrompt;
  if (isGeneralExpert(id)) {
    built = buildDefaultPrompt(req);
  } else {
    const expert = id ? getExpert(id) : undefined;
    if (!expert) {
      built = buildDefaultPrompt(req);
    } else {
      const resolved = resolveExpertPrompts(expert, req);
      const { system, user, outputField, usesYamlOutput } = resolved;
      built = usesYamlOutput
        ? {
            system,
            user,
            postProcess: (raw) =>
              extractExpertTranslation(raw, outputField, usesYamlOutput),
          }
        : { system, user };
    }
  }
  return withPreviousContext(built, req);
}

function withPreviousContext(built: BuiltPrompt, req: TranslateRequest): BuiltPrompt {
  const ctx = req.previousContext;
  if (!ctx?.sourceTail?.trim() || !ctx.translationTail?.trim()) return built;
  const note = [
    "For terminology consistency with the previous segment, here is the end of the previous source and its translation.",
    "Do not repeat them; continue naturally from where they left off.",
    `Previous source (tail):\n${ctx.sourceTail}`,
    `Previous translation (tail):\n${ctx.translationTail}`,
  ].join("\n");
  return { ...built, system: `${built.system}\n\n${note}` };
}

function buildDefaultPrompt(req: TranslateRequest): BuiltPrompt {
  const sourceDesc =
    req.sourceLang === "auto" || !req.sourceLang
      ? langDisplayName("auto")
      : langDisplayName(req.sourceLang);
  const targetDesc = langDisplayName(req.targetLang);

  const system = [
    `You are a professional translator. Translate the user's text from ${sourceDesc} to ${targetDesc}.`,
    "Output ONLY the translated text — no explanations, no quotes, no preamble.",
    "Preserve the original formatting, line breaks, and document structure exactly.",
  ].join("\n");

  return { system, user: req.text };
}
