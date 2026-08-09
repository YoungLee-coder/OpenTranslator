import type {
  TranslateEmailDisplay,
  TranslateEmailRequest,
} from "@opentranslator/shared-types";
import type { BuiltPrompt } from "../../experts/prompt";
import { langDisplayName } from "../../experts/lang";

/**
 * Best-effort strip of Gmail quoted replies / signatures from HTML.
 * Returns { body, tail } where tail is preserved and appended after translation.
 */
export function splitEmailQuotes(
  html: string,
  preserveQuotes: boolean,
): { body: string; tail: string } {
  if (!preserveQuotes) return { body: html, tail: "" };

  const patterns: RegExp[] = [
    /<div[^>]*class="[^"]*\bgmail_quote\b[^"]*"[^>]*>[\s\S]*$/i,
    /<blockquote[^>]*class="[^"]*\bgmail_quote\b[^"]*"[^>]*>[\s\S]*$/i,
    /<div[^>]*class="[^"]*\bgmail_extra\b[^"]*"[^>]*>[\s\S]*$/i,
    /<div[^>]*class="[^"]*\bgmail_signature\b[^"]*"[^>]*>[\s\S]*$/i,
    /<div[^>]*data-smartmail="gmail_signature"[^>]*>[\s\S]*$/i,
  ];

  let body = html;
  let tail = "";
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.index != null) {
      tail = body.slice(m.index) + tail;
      body = body.slice(0, m.index);
      break; // first (usually outermost) quote is enough
    }
  }
  return { body: body.trim(), tail };
}

/** Strip markdown fences / preamble the model sometimes adds around HTML. */
export function unwrapEmailHtml(raw: string): string {
  let text = raw.trim();
  if (!text) return "";
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstTag = text.search(/<[a-z]/i);
  if (firstTag > 0 && firstTag < 120 && !text.slice(0, firstTag).includes("<")) {
    text = text.slice(firstTag).trim();
  }
  return text;
}

export function resolveEmailDisplay(
  display: TranslateEmailRequest["display"],
): TranslateEmailDisplay {
  return display === "bilingual" ? "bilingual" : "replace";
}

function buildReplacePrompt(
  sourceDesc: string,
  targetDesc: string,
  html: string,
): BuiltPrompt {
  const system = [
    `You are a professional email translator. Translate the email HTML from ${sourceDesc} to ${targetDesc}.`,
    "Output ONLY the translated HTML — no explanations, no markdown fences, no preamble.",
    "Rules:",
    "1. Keep the exact HTML tag structure and nesting order.",
    "2. Preserve formatting tags and attributes: bold/italic/underline, font, color, style, tables, lists, links (especially href).",
    "3. Keep every <img> tag unchanged (src, alt, width, height, style) — never remove or rewrite images.",
    "4. Do not translate URLs, email addresses, or code.",
    "5. Do not add tags that were not in the source. Do not merge or split paragraphs.",
    "6. Translate only human-readable text nodes.",
  ].join("\n");

  return { system, user: html };
}

function buildBilingualPrompt(
  sourceDesc: string,
  targetDesc: string,
  html: string,
): BuiltPrompt {
  const system = [
    `You are a professional email translator. Produce a bilingual HTML email from ${sourceDesc} to ${targetDesc}.`,
    "Output ONLY the bilingual HTML — no explanations, no markdown fences, no preamble.",
    "Rules:",
    "1. For each readable content block (paragraph, list item, heading, table cell, etc.), keep the source text and immediately follow it with its translation.",
    '2. Wrap every translation segment in <div class="ot-gmail-translation">...</div>. Use a block-level div even for short phrases.',
    "3. You may lightly rearrange or polish the source wording for readability, but preserve the original meaning and do not invent content.",
    "4. Preserve overall layout: tables, lists, links (especially href), and formatting (bold/italic/underline, font, color, style) should remain usable.",
    "5. Keep every <img> tag unchanged (src, alt, width, height, style) — never remove or rewrite images.",
    "6. Do not translate URLs, email addresses, or code.",
    "7. Do not leave bare translation text outside ot-gmail-translation wrappers.",
    "8. Quoted reply / signature blocks are not included in the input; translate only what you are given.",
  ].join("\n");

  return { system, user: html };
}

/**
 * Fixed prompt for whole-email HTML translation.
 * Expert prompts are intentionally not used — layout fidelity comes first.
 */
export function buildEmailTranslatePrompt(req: TranslateEmailRequest, html: string): BuiltPrompt {
  const sourceDesc =
    req.sourceLang === "auto" || !req.sourceLang
      ? langDisplayName("auto")
      : langDisplayName(req.sourceLang);
  const targetDesc = langDisplayName(req.targetLang);
  const display = resolveEmailDisplay(req.display);

  if (display === "bilingual") {
    return buildBilingualPrompt(sourceDesc, targetDesc, html);
  }
  return buildReplacePrompt(sourceDesc, targetDesc, html);
}
