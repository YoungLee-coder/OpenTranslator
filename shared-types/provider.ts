import type { TranslateRequest, TranslateResponse } from "./translate";

export type ProviderType =
  | "openai"
  | "claude"
  | "gemini"
  | "aihubmix"
  | "openrouter"
  | "cloudflare"
  | "deepl"
  | "custom";

/** Inner wire formats a custom (multi-endpoint) provider may expose. */
export const PROVIDER_API_FORMATS = ["openai", "claude", "gemini"] as const;
export type ProviderApiFormat = (typeof PROVIDER_API_FORMATS)[number];

export const MAX_CUSTOM_ENDPOINTS = 8;

/** One API address on a custom provider: format + SDK root + models on that route. */
export interface ProviderEndpoint {
  format: ProviderApiFormat;
  baseUrl: string;
  models: string[];
}

/**
 * Resolved per-provider configuration passed into an adapter.
 * The apiKey is the decrypted plaintext; everything else comes from the
 * providers row + providerSchemas form input.
 */
export interface ProviderContext {
  apiKey: string;
  /**
   * Official SDK root URL (not a full endpoint path).
   * OpenAI: https://api.openai.com/v1
   * Anthropic: https://api.anthropic.com
   * Gemini: https://generativelanguage.googleapis.com
   */
  baseUrl?: string;
  defaultModel?: string;
  configJson?: Record<string, unknown>;
  /**
   * 站点设置：为 true 时 adapter 在请求中关闭推理 / 思考链。
   * 由 translate / write / email 等 handler 从 SiteSettings 注入。
   */
  disableModelReasoning?: boolean;
}

/**
 * Unified adapter contract. New vendors = new adapter file + one registry line.
 * `translateStream` emits UTF-8 translation-text deltas; the route layer wraps
 * them into SSE.
 */
export interface TranslationProvider {
  name: ProviderType;
  translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse>;
  translateStream?(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array>;
}

/** A provider row as exposed to the dashboard (never includes the api key). */
export interface ProviderRecord {
  id: string;
  type: ProviderType;
  displayName: string;
  baseUrl?: string;
  defaultModel?: string;
  /** 该供应商支持的全部模型，首页按模型逐个展开供选择。 */
  models?: string[];
  configJson?: Record<string, unknown>;
  enabled: boolean;
  isPublicDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateProviderRequest {
  type: ProviderType;
  displayName: string;
  apiKey: string; // plaintext, encrypted server-side
  baseUrl?: string;
  defaultModel?: string;
  /** 该供应商支持的全部模型；首项视为默认模型。 */
  models?: string[];
  configJson?: Record<string, unknown>;
  enabled?: boolean;
  isPublicDefault?: boolean;
}

export type UpdateProviderRequest = Partial<CreateProviderRequest>;

/** Admin: probe Worker → model API with a minimal "say hi" request. */
export interface TestProviderLatencyRequest {
  type: ProviderType;
  /** Plaintext key; optional when providerId is set (uses stored key). */
  apiKey?: string;
  providerId?: string;
  baseUrl?: string;
  model?: string;
  configJson?: Record<string, unknown>;
}

export interface TestProviderLatencyResponse {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  error?: string;
  /** Short model reply snippet when the probe succeeds. */
  replyPreview?: string;
}

export function isProviderApiFormat(value: unknown): value is ProviderApiFormat {
  return (PROVIDER_API_FORMATS as readonly string[]).includes(value as string);
}

/** Split a models textarea into unique trimmed names. */
export function parseModelLines(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean),
    ),
  );
}

export function parseProviderEndpoints(raw: unknown): ProviderEndpoint[] {
  if (!Array.isArray(raw)) return [];
  const out: ProviderEndpoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (!isProviderApiFormat(rec.format)) continue;
    const baseUrl = typeof rec.baseUrl === "string" ? rec.baseUrl.trim() : "";
    const models = Array.isArray(rec.models)
      ? Array.from(
          new Set(
            rec.models
              .filter((m): m is string => typeof m === "string")
              .map((m) => m.trim())
              .filter(Boolean),
          ),
        )
      : [];
    out.push({ format: rec.format, baseUrl, models });
    if (out.length >= MAX_CUSTOM_ENDPOINTS) break;
  }
  return out;
}

export function flattenEndpointModels(endpoints: ProviderEndpoint[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ep of endpoints) {
    for (const m of ep.models) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

export function findEndpointForModel(
  endpoints: ProviderEndpoint[],
  model: string,
): ProviderEndpoint | undefined {
  const needle = model.trim();
  if (!needle) return undefined;
  return endpoints.find((ep) => ep.models.includes(needle));
}

export function duplicateEndpointModels(endpoints: ProviderEndpoint[]): string[] {
  const counts = new Map<string, number>();
  for (const ep of endpoints) {
    for (const m of ep.models) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([m]) => m);
}

export type EndpointValidationError =
  | { code: "empty" }
  | { code: "baseUrl"; index: number }
  | { code: "models"; index: number }
  | { code: "duplicate"; models: string[] };

export function validateProviderEndpoints(
  endpoints: ProviderEndpoint[],
): EndpointValidationError | null {
  if (endpoints.length === 0) return { code: "empty" };
  for (let i = 0; i < endpoints.length; i++) {
    const ep = endpoints[i];
    if (!ep) continue;
    if (!ep.baseUrl || !/^https?:\/\//i.test(ep.baseUrl)) {
      return { code: "baseUrl", index: i };
    }
    if (ep.models.length === 0) return { code: "models", index: i };
  }
  const dups = duplicateEndpointModels(endpoints);
  if (dups.length) return { code: "duplicate", models: dups };
  return null;
}

/** Dynamic form field descriptor for the dashboard provider form. */
export type ProviderFieldType =
  | "text"
  | "password"
  | "boolean"
  | "select"
  | "models"
  | "endpoints";

/** 下拉选项：纯字符串（值即标签）或 { value, label }（值与展示文案分离，用于汉化）。 */
export type SelectOption = string | { value: string; label?: string };

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  placeholder?: string;
  options?: SelectOption[];
  required?: boolean;
  /** 存在时该字段锁定为此预设值，前端不可编辑、提交取此值。 */
  preset?: string;
  /** 可编辑的默认值；用于 select 等需要初始选中项的字段，用户可改选。 */
  defaultValue?: string;
}
