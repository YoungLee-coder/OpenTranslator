import type { WriteFormality, WriteRequest, WriteStyle } from "@opentranslator/shared-types";
import type { BuiltPrompt } from "../../experts/prompt";

const LANG_LABELS: Record<string, string> = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  vi: "Vietnamese",
  th: "Thai",
};

const STYLE_LABELS: Record<WriteStyle, string> = {
  simple: "simple and straightforward, accessible to a broad audience",
  business: "professional business tone suitable for workplace emails, reports, and presentations",
  academic: "formal academic tone suitable for research papers, articles, and scholarly writing",
  casual: "informal and conversational, suitable for social media, messaging, and blogs",
};

function langLabel(code: string): string {
  return LANG_LABELS[code] ?? code;
}

function baseSystem(req: WriteRequest): string[] {
  return [
    "You are a professional writing assistant similar to DeepL Write.",
    `The user's text is in ${langLabel(req.lang)}.`,
    "Revise the text while preserving the original meaning and the writer's voice.",
    "Output ONLY the revised text — no explanations, no quotes, no preamble.",
    "Preserve the original formatting, line breaks, and document structure exactly.",
  ];
}

/**
 * Build system + user prompts for AI Write modes.
 */
export function buildWritePrompt(req: WriteRequest): BuiltPrompt {
  switch (req.mode) {
    case "improve":
      return {
        system: [
          ...baseSystem(req),
          "Fix grammar, spelling, and punctuation.",
          "Improve clarity, fluency, and natural phrasing.",
        ].join("\n"),
        user: req.text,
      };
    case "style": {
      const style = req.style ?? "simple";
      return {
        system: [
          ...baseSystem(req),
          `Rewrite the entire text in a ${STYLE_LABELS[style]} style.`,
        ].join("\n"),
        user: req.text,
      };
    }
    case "formality": {
      const formality = req.formality ?? "formal";
      const tone =
        formality === "formal"
          ? "more formal and polished"
          : "more informal and relaxed";
      return {
        system: [
          ...baseSystem(req),
          `Adjust the formality of the entire text to be ${tone}, while keeping the same meaning.`,
        ].join("\n"),
        user: req.text,
      };
    }
    case "shorten":
      return {
        system: [
          ...baseSystem(req),
          "Make the text more concise without losing essential meaning or nuance.",
          "Remove redundancy and wordiness while keeping the core message intact.",
        ].join("\n"),
        user: req.text,
      };
  }
}
