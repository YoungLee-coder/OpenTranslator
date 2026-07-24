import type { TranslateRequest, TranslateResponse } from "./translate";

export type ProviderType =
  | "openai"
  | "claude"
  | "gemini"
  | "aihubmix"
  | "custom"
  | "cloudflare"
  | "deepl";

/**
 * Resolved per-provider configuration passed into an adapter.
 * The apiKey is the decrypted plaintext; everything else comes from the
 * providers row + providerSchemas form input.
 */
export interface ProviderContext {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  configJson?: Record<string, unknown>;
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

/** Admin: probe Worker → baseUrl HTTP RTT (no API key). */
export interface TestProviderLatencyRequest {
  baseUrl: string;
}

export interface TestProviderLatencyResponse {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  error?: string;
}

/** Dynamic form field descriptor for the dashboard provider form. */
export type ProviderFieldType = "text" | "password" | "boolean" | "select" | "models";

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
