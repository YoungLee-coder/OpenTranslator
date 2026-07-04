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

/** Dynamic form field descriptor for the dashboard provider form. */
export type ProviderFieldType = "text" | "password" | "boolean" | "select" | "models";

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  /** 存在时该字段锁定为此预设值，前端不可编辑、提交取此值。 */
  preset?: string;
}
