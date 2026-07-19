/**
 * Paste normalization + paragraph-aware splitting for long-text translation.
 */

/**
 * Light paste repair: always fix CRLF + hyphenated line breaks.
 * Soft-wrap reflow only when the text looks like PDF/Word reflow
 * (many short lines, few paragraph breaks, not lists/code).
 */
export function normalizePastedText(text: string): string {
  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // word-\nword → wordword (PDF hyphenation)
  s = s.replace(/(\p{L}|\p{N})-\n(\p{L}|\p{N})/gu, "$1$2");

  if (looksLikeReflow(s)) {
    // single newlines inside a paragraph → space; keep \n\n
    s = s.replace(/([^\n])\n(?!\n)/g, "$1 ");
    s = s.replace(/[ \t]{2,}/g, " ");
  }

  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** Many short prose lines + few blank lines → likely PDF/Word reflow. */
function looksLikeReflow(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 6) return false;
  if (text.includes("```")) return false;

  // Code / indented blocks
  const indented = lines.filter((l) => /^[ \t]{2,}/.test(l) || /^\t/.test(l)).length;
  if (indented / lines.length > 0.2) return false;

  // Markdown / plain lists or numbered lines — keep structure
  const listLike = lines.filter((l) =>
    /^\s*([-*•]|\d+[.)]、)\s+/.test(l),
  ).length;
  if (listLike / lines.length > 0.2) return false;

  const avg = lines.reduce((a, l) => a + l.length, 0) / lines.length;
  const blankParas = (text.match(/\n\n+/g) ?? []).length;
  // Short lines + almost no paragraph breaks
  return avg < 85 && blankParas < lines.length / 10;
}

export interface ChunkPlan {
  chunks: string[];
  /** joins[i] inserted between chunks[i] and chunks[i+1] */
  joins: string[];
}

/**
 * Split text into chunks near `targetChars`. Prefer `\n\n` paragraphs, then
 * sentences, then hard cut.
 */
export function splitIntoChunks(text: string, targetChars: number): ChunkPlan {
  if (text.length <= targetChars) {
    return { chunks: [text], joins: [] };
  }

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  const joins: string[] = [];
  let current = "";

  const flush = (joinBeforeNext: string) => {
    if (!current) return;
    if (chunks.length > 0) joins.push(joinBeforeNext);
    chunks.push(current);
    current = "";
  };

  for (const p of paragraphs) {
    if (p.length > targetChars) {
      flush("\n\n");
      const parts = splitOversized(p, targetChars);
      for (let i = 0; i < parts.chunks.length; i++) {
        if (chunks.length > 0) {
          joins.push(i === 0 ? "\n\n" : parts.joins[i - 1]!);
        }
        chunks.push(parts.chunks[i]!);
      }
      continue;
    }
    const next = current ? `${current}\n\n${p}` : p;
    if (next.length > targetChars && current) {
      flush("\n\n");
      current = p;
    } else {
      current = next;
    }
  }
  if (current) {
    if (chunks.length > 0) joins.push("\n\n");
    chunks.push(current);
  }
  return { chunks, joins };
}

function splitOversized(text: string, targetChars: number): ChunkPlan {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) {
    return hardCut(text, targetChars);
  }

  const chunks: string[] = [];
  const joins: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > targetChars) {
      if (current) {
        if (chunks.length > 0) joins.push(" ");
        chunks.push(current);
        current = "";
      }
      const hard = hardCut(s, targetChars);
      for (let i = 0; i < hard.chunks.length; i++) {
        if (chunks.length > 0) joins.push(i === 0 ? " " : hard.joins[i - 1]!);
        chunks.push(hard.chunks[i]!);
      }
      continue;
    }
    const next = current ? `${current} ${s}` : s;
    if (next.length > targetChars && current) {
      if (chunks.length > 0) joins.push(" ");
      chunks.push(current);
      current = s;
    } else {
      current = next;
    }
  }
  if (current) {
    if (chunks.length > 0) joins.push(" ");
    chunks.push(current);
  }
  return { chunks, joins };
}

/** Avoid lookbehind for broader runtime compatibility. */
function splitSentences(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (!".!?。！？…".includes(ch)) continue;
    let end = i + 1;
    while (end < text.length && /\s/.test(text[end]!)) end++;
    const piece = text.slice(start, end).trim();
    if (piece) parts.push(piece);
    start = end;
    i = end - 1;
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function hardCut(text: string, targetChars: number): ChunkPlan {
  const chunks: string[] = [];
  const joins: string[] = [];
  for (let i = 0; i < text.length; i += targetChars) {
    if (chunks.length > 0) joins.push("");
    chunks.push(text.slice(i, i + targetChars));
  }
  return { chunks, joins };
}

export function tailSlice(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
}
