import { parse as parseYaml } from "yaml";

/**
 * Extract translated text from model output.
 * IT experts often return YAML arrays; others return plain text.
 */
export function extractExpertTranslation(
  raw: string,
  outputField: string | undefined,
  usesYamlOutput: boolean,
): string {
  const trimmed = raw.trim();
  if (!usesYamlOutput) return trimmed;

  const field = outputField ?? "text";

  // Try fenced code block first.
  const fence = trimmed.match(/```(?:yaml)?\s*([\s\S]*?)```/);
  const yamlText = fence ? fence[1]!.trim() : trimmed;

  try {
    const parsed = parseYaml(yamlText) as unknown;
    const fromArray = extractFromYamlValue(parsed, field);
    if (fromArray) return fromArray;
  } catch {
    // fall through
  }

  // Regex fallback — capture quoted/block values or remainder of line(s).
  const quoted = yamlText.match(
    new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"),
  );
  if (quoted?.[1]) return quoted[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  const block = yamlText.match(
    new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*\\|\\s*\\n((?:[ \\t].*\\n?)*)`, "m"),
  );
  if (block?.[1]) {
    return block[1]
      .split("\n")
      .map((l) => l.replace(/^[ \t]/, ""))
      .join("\n")
      .trim();
  }

  const re = new RegExp(`(?:^|\\n)\\s*${field}\\s*:\\s*(.+?)(?=\\n\\s*\\w|$)`, "ms");
  const m = yamlText.match(re);
  if (m?.[1]) return stripQuotes(m[1].trim());

  // Last resort: strip fences and return trimmed body (better than raw YAML).
  const stripped = yamlText.replace(/^```(?:yaml)?\s*/i, "").replace(/```\s*$/, "").trim();
  return stripped || trimmed;
}

function extractFromYamlValue(value: unknown, field: string): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object" && field in item) {
        const v = (item as Record<string, unknown>)[field];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    // Prefer step2 over step1 for two-step experts.
    for (const item of value) {
      if (item && typeof item === "object" && "step2" in item) {
        const v = (item as Record<string, unknown>).step2;
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
  }
  if (value && typeof value === "object" && field in value) {
    const v = (value as Record<string, unknown>)[field];
    if (typeof v === "string") return v.trim();
  }
  return null;
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
