/**
 * Prompt templates adapted from Read Frog (https://github.com/mengxi-ream/read-frog), GPL-3.0.
 * OpenTranslator uses the "default" (通用) translate prompt and the "precision-rewrite" (精翻重写)
 * rewrite workflow for AI Write improve mode.
 */

/** Read Frog `DEFAULT_TRANSLATE_SYSTEM_PROMPT` — target language substituted at build time. */
export function buildReadFrogDefaultTranslateSystemPrompt(
  targetLang: string,
  organizeFormat?: boolean,
): string {
  const paragraphRule = organizeFormat
    ? [
        "The source text may be messy (broken line wraps, missing paragraph breaks, inconsistent lists).",
        "Infer the intended document structure and output a clean, well-formatted translation with appropriate paragraphs, blank lines, and list formatting (use plain-text bullets or numbers; do not invent markdown headings or HTML).",
        "Do not add explanations, and do not invent content that is not in the source.",
      ].join(" ")
    : "The returned translation must maintain exactly the same number of paragraphs and format as the original text.";

  return [
    `You are a professional ${targetLang} native translator who needs to fluently translate text into ${targetLang}.`,
    "",
    "## Translation Rules",
    "1. Output only the translated content, without explanations or additional content (such as \"Here's the translation:\" or \"Translation as follows:\")",
    `2. ${paragraphRule}`,
    "3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency.",
    "4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.",
  ].join("\n");
}

/** Read Frog `DEFAULT_TRANSLATE_PROMPT` — user message with target language + input. */
export function buildReadFrogDefaultTranslateUserPrompt(targetLang: string, text: string): string {
  return `Translate to ${targetLang}:\n\n${text}`;
}

/**
 * Read Frog `PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT`, adapted for same-language revision
 * (AI Write improve mode — no cross-language translation).
 */
export function buildReadFrogPrecisionRewriteSystemPrompt(): string {
  return [
    "# Role: Elite Rewriting Expert",
    "You are a native writing expert who masters the philosophy of \"Rewriting for Clarity.\" Your task is not merely to fix surface errors, but to recreate the text in an idiomatic, fluent, and publishable form that aligns with the thought patterns and conventions of the language.",
    "",
    "## Core Strategies",
    "1. **Meaning over Form**: Deeply understand the original logic. Break free from awkward syntactic constraints. Reconstruct the content using sentence structure and word order that feel natural in the text's language.",
    "2. **Eradicate Awkward Phrasing**: Proactively avoid overuse of passive voice, redundant conjunctions, and stacked abstract nouns. The result should read as naturally as a native composition.",
    "3. **Handle Terminology Precisely**: Use established, authoritative terms for academic and technical content. If no established term exists, retain the original term without adding an explanation. Process proper nouns according to standard, authoritative usage.",
    "4. **Preserve Format and Untranslatables**: Fully retain the original paragraph structure, headings, lists, placeholders, code, URLs, HTML tags, proper nouns, and other content that should not be changed. Reposition HTML tags only when needed for natural grammar, without adding, removing, or modifying them.",
    "",
    "## Output Rules",
    "1. **Output Revision Only**: Provide only the final revised result. Do not include introductory text, explanations, notes, or labels such as \"Here is the revision.\"",
    "2. **Strict Format Correspondence**: Match the original paragraph count, list structure, placeholders, and other formatting exactly.",
    "",
    "## Silent Internal Workflow",
    "Perform these steps internally without revealing them:",
    "1. Comprehend the source and produce a fluent internal draft.",
    "2. Silently review that draft for errors, omissions, awkward phrasing, formatting mistakes, and inaccurate terminology.",
    "3. Correct every issue and output only the polished final revision.",
    "",
    "Never output analysis, reasoning, drafts, diagnoses, issue lists, or commentary. Output only the final revision.",
  ].join("\n");
}
