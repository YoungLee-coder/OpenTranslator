import type { TranslateRequest, TranslateResponse } from "@opentranslator/shared-types";
import { utf8Encode } from "./bytes";

/**
 * Translation result cache backed by the SETTINGS_KV namespace. Keyed by
 * provider + language pair + text hash (+ glossary hash when a glossary is
 * supplied), so identical requests are served instantly without re-calling
 * the upstream model.
 */

const PREFIX = "tr:";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", utf8Encode(s));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function translationCacheKey(
  req: TranslateRequest,
  providerId: string,
): Promise<string> {
  const glossary = req.glossary ? await sha256Hex(JSON.stringify(req.glossary)) : "none";
  const text = await sha256Hex(req.text);
  const model = req.model ?? "";
  return `${PREFIX}${providerId}:${model}:${req.sourceLang}:${req.targetLang}:${glossary}:${text}`;
}

export async function getTranslationCache(
  kv: KVNamespace,
  key: string,
): Promise<TranslateResponse | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TranslateResponse;
  } catch {
    return null;
  }
}

export async function setTranslationCache(
  kv: KVNamespace,
  key: string,
  value: TranslateResponse,
  ttlSeconds: number,
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(value), {
      // KV 要求 expirationTtl >= 60 秒；调用方按站点设置传入。
      expirationTtl: Math.max(60, ttlSeconds),
    });
  } catch {
    // KV is best-effort; a write failure must never break a translation.
  }
}
