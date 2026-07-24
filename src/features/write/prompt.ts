import type { WriteRequest, WriteStyle } from "@opentranslator/shared-types";
import type { BuiltPrompt } from "../../experts/prompt";

const STYLE_LABELS: Record<WriteStyle, string> = {
  simple: "simple and straightforward, accessible to a broad audience",
  business: "professional business tone suitable for workplace emails, reports, and presentations",
  academic: "formal academic tone suitable for research papers, articles, and scholarly writing",
  casual: "informal and conversational, suitable for social media, messaging, and blogs",
};

function baseSystem(): string[] {
  return [
    "You are a professional writing assistant similar to DeepL Write.",
    "Detect the language of the user's text and keep the revised output in the same language.",
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
          ...baseSystem(),
          "Fix grammar, spelling, and punctuation.",
          "Improve clarity, fluency, and natural phrasing.",
        ].join("\n"),
        user: req.text,
      };
    case "style": {
      const style = req.style ?? "simple";
      return {
        system: [
          ...baseSystem(),
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
          ...baseSystem(),
          `Adjust the formality of the entire text to be ${tone}, while keeping the same meaning.`,
        ].join("\n"),
        user: req.text,
      };
    }
    case "shorten":
      return {
        system: [
          ...baseSystem(),
          "Make the text more concise without losing essential meaning or nuance.",
          "Remove redundancy and wordiness while keeping the core message intact.",
        ].join("\n"),
        user: req.text,
      };
  }
}
