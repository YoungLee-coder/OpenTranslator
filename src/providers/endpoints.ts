import type {
  ProviderEndpoint,
  ProviderType,
} from "@opentranslator/shared-types";
import {
  flattenEndpointModels,
  parseProviderEndpoints,
  validateProviderEndpoints,
} from "@opentranslator/shared-types";
import { normalizeStoredProviderBaseUrl } from "./base-url";

export type PreparedCustomProvider = {
  endpoints: ProviderEndpoint[];
  models: string[];
  baseUrl: string | undefined;
};

function endpointErrorMessage(
  err: NonNullable<ReturnType<typeof validateProviderEndpoints>>,
): string {
  switch (err.code) {
    case "empty":
      return "at least one API endpoint is required";
    case "baseUrl":
      return `endpoint ${err.index + 1}: Base URL must start with http(s)://`;
    case "models":
      return `endpoint ${err.index + 1}: at least one model is required`;
    case "duplicate":
      return `duplicate model names across endpoints: ${err.models.join(", ")}`;
  }
}

/**
 * Normalize + validate custom provider endpoints from configJson.
 * Derives flattened `models` and a display `baseUrl` from the first address.
 */
export function prepareCustomProvider(
  configJson: Record<string, unknown> | undefined,
): { ok: true; value: PreparedCustomProvider } | { ok: false; error: string } {
  const parsed = parseProviderEndpoints(configJson?.endpoints);
  const endpoints: ProviderEndpoint[] = parsed.map((ep) => ({
    ...ep,
    baseUrl: normalizeStoredProviderBaseUrl(ep.format, ep.baseUrl) ?? ep.baseUrl,
  }));
  const invalid = validateProviderEndpoints(endpoints);
  if (invalid) return { ok: false, error: endpointErrorMessage(invalid) };
  const models = flattenEndpointModels(endpoints);
  return {
    ok: true,
    value: {
      endpoints,
      models,
      baseUrl: endpoints[0]?.baseUrl,
    },
  };
}

export function isCustomProviderType(
  type: string | undefined,
): type is Extract<ProviderType, "custom"> {
  return type === "custom";
}
