import type {
  TranslateEmailDisplay,
  TranslateEmailRequest,
} from "@opentranslator/shared-types";
import type { BuiltPrompt } from "../../experts/prompt";
import { langDisplayName } from "../../experts/lang";

const INVISIBLE_OR_SPACE = /[\s\u200b\u200c\u200d\u2060\ufeff]+/g;

function visiblePlainLengthFromHtml(html: string): number {
  return html.replace(/<[^>]+>/g, " ").replace(INVISIBLE_OR_SPACE, " ").trim().length;
}

/**
 * Best-effort strip of Gmail quoted replies / signatures from HTML.
 * Returns { body, tail } where tail is preserved and appended after translation.
 * If stripping would leave no visible text (typical Gmail forward), keep the
 * original HTML so the model actually receives the message.
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
  if (!body.trim() || visiblePlainLengthFromHtml(body) === 0) {
    return { body: html.trim(), tail: "" };
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

function buildReplacePrompt(targetDesc: string, html: string): BuiltPrompt {
  return {
    system: `Translate the HTML to ${targetDesc}.`,
    user: html,
  };
}

function buildBilingualPrompt(targetDesc: string, html: string): BuiltPrompt {
  return {
    system: `Translate the HTML to ${targetDesc}. Output bilingual HTML with the source text and translation.`,
    user: html,
  };
}

/**
 * Fixed prompt for whole-email HTML translation.
 * Expert prompts are intentionally not used.
 */
export function buildEmailTranslatePrompt(req: TranslateEmailRequest, html: string): BuiltPrompt {
  const targetDesc = langDisplayName(req.targetLang);
  const display = resolveEmailDisplay(req.display);

  if (display === "bilingual") {
    return buildBilingualPrompt(targetDesc, html);
  }
  return buildReplacePrompt(targetDesc, html);
}
