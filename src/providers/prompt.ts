import type { TranslateRequest } from "@opentranslator/shared-types";

/**
 * Shared translation prompt. Rules:
 *  - output only the translation (no preamble/quotes)
 *  - preserve formatting & line breaks
 *  - honour the glossary when present
 *  - source "auto" => let the model detect
 */
export function buildPrompt(req: TranslateRequest): { system: string; user: string } {
  const sourceDesc =
    req.sourceLang === "auto" || !req.sourceLang
      ? "the detected source language"
      : req.sourceLang;

  const system = [
    `You are a professional translator. Translate the user's text from ${sourceDesc} to ${req.targetLang}.`,
    "Output ONLY the translated text — no explanations, no quotes, no preamble.",
    "Preserve the original formatting, line breaks, and document structure exactly.",
    req.glossary && Object.keys(req.glossary).length > 0
      ? "A glossary is provided; strictly use these term mappings wherever they appear."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let user = "";
  if (req.glossary && Object.keys(req.glossary).length > 0) {
    const lines = Object.entries(req.glossary).map(([s, t]) => `- ${s} -> ${t}`);
    user += "Glossary:\n" + lines.join("\n") + "\n\n";
  }
  user += req.text;
  return { system, user };
}
