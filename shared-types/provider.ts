import type { TranslateRequest, TranslateResponse } from "./translate";

export type ProviderType =
  | "openai"
  | "claude"
  | "gemini"
  | "deepseek"
  | "openrouter"
  | "aihubmix"
  | "azure_openai"
  | "custom";

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
  configJson?: Record<string, unknown>;
  enabled?: boolean;
  isPublicDefault?: boolean;
}

export type UpdateProviderRequest = Partial<CreateProviderRequest>;

/** Dynamic form field descriptor for the dashboard provider form. */
export type ProviderFieldType = "text" | "password" | "boolean" | "select";

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}
