/**
 * Block-aware splitting for long email HTML translation.
 * Splits only at block-element boundaries so chunks can be rejoined without breaking tags.
 */

import type { ChunkPlan } from "./text-chunks";

const BLOCK_CLOSE_TAG =
  /<\/(?:p|div|li|tr|td|th|blockquote|h[1-6]|section|article|header|footer|table|ul|ol|dl|pre|hr)>/gi;

/**
 * Split email HTML into chunks near `targetChars`. Prefer boundaries after block
 * closing tags; fall back to safe cuts after `>` when a segment is still oversized.
 */
export function splitEmailHtmlIntoChunks(html: string, targetChars: number): ChunkPlan {
  if (html.length <= targetChars) {
    return { chunks: [html], joins: [] };
  }

  const segments = splitIntoBlockSegments(html);
  if (segments.length <= 1) {
    return hardCutHtml(html, targetChars);
  }

  const chunks: string[] = [];
  const joins: string[] = [];
  let current = "";

  const flush = () => {
    if (!current) return;
    if (chunks.length > 0) joins.push("");
    chunks.push(current);
    current = "";
  };

  for (const seg of segments) {
    if (seg.length > targetChars) {
      flush();
      const parts = splitOversizedSegment(seg, targetChars);
      for (let i = 0; i < parts.chunks.length; i++) {
        if (chunks.length > 0) {
          joins.push(i === 0 ? "" : parts.joins[i - 1]!);
        }
        chunks.push(parts.chunks[i]!);
      }
      continue;
    }
    const next = current ? current + seg : seg;
    if (next.length > targetChars && current) {
      flush();
      current = seg;
    } else {
      current = next;
    }
  }
  if (current) {
    if (chunks.length > 0) joins.push("");
    chunks.push(current);
  }
  return { chunks, joins };
}

function splitIntoBlockSegments(html: string): string[] {
  const boundaries = findBlockBoundaries(html);
  if (boundaries.length <= 1) return [html];

  const segments: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const seg = html.slice(boundaries[i], boundaries[i + 1]);
    if (seg) segments.push(seg);
  }
  return segments.length > 0 ? segments : [html];
}

function findBlockBoundaries(html: string): number[] {
  const positions: number[] = [0];
  const re = new RegExp(BLOCK_CLOSE_TAG.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    let pos = match.index + match[0].length;
    while (pos < html.length && /\s/.test(html[pos]!)) pos++;
    const last = positions[positions.length - 1]!;
    if (pos < html.length && pos !== last) {
      positions.push(pos);
    }
  }
  const end = html.length;
  if (positions[positions.length - 1] !== end) {
    positions.push(end);
  }
  return positions;
}

function splitOversizedSegment(segment: string, targetChars: number): ChunkPlan {
  const innerBoundaries = findBlockBoundaries(segment);
  if (innerBoundaries.length <= 2) {
    return hardCutHtml(segment, targetChars);
  }

  const innerSegments: string[] = [];
  for (let i = 0; i < innerBoundaries.length - 1; i++) {
    const seg = segment.slice(innerBoundaries[i], innerBoundaries[i + 1]);
    if (seg) innerSegments.push(seg);
  }

  const chunks: string[] = [];
  const joins: string[] = [];
  let current = "";

  const flush = () => {
    if (!current) return;
    if (chunks.length > 0) joins.push("");
    chunks.push(current);
    current = "";
  };

  for (const seg of innerSegments) {
    if (seg.length > targetChars) {
      flush();
      const hard = hardCutHtml(seg, targetChars);
      for (let i = 0; i < hard.chunks.length; i++) {
        if (chunks.length > 0) joins.push(i === 0 ? "" : hard.joins[i - 1]!);
        chunks.push(hard.chunks[i]!);
      }
      continue;
    }
    const next = current ? current + seg : seg;
    if (next.length > targetChars && current) {
      flush();
      current = seg;
    } else {
      current = next;
    }
  }
  if (current) {
    if (chunks.length > 0) joins.push("");
    chunks.push(current);
  }
  return { chunks, joins };
}

function hardCutHtml(html: string, targetChars: number): ChunkPlan {
  const chunks: string[] = [];
  const joins: string[] = [];
  let start = 0;
  while (start < html.length) {
    let end = Math.min(start + targetChars, html.length);
    if (end < html.length) {
      const slice = html.slice(start, end);
      const lastGt = slice.lastIndexOf(">");
      const lastLt = slice.lastIndexOf("<");
      if (lastGt > lastLt && lastGt >= 0) {
        end = start + lastGt + 1;
      } else if (lastLt > 0) {
        end = start + lastLt;
      }
      if (end <= start) {
        end = Math.min(start + targetChars, html.length);
      }
    }
    if (chunks.length > 0) joins.push("");
    chunks.push(html.slice(start, end));
    start = end;
  }
  return { chunks, joins };
}
