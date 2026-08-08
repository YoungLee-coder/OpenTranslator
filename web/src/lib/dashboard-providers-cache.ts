import type {
  ProviderField,
  ProviderRecord,
  ProviderType,
  SiteSettings,
} from "@opentranslator/shared-types";
import { apiGet } from "./api-client";
import { createSessionSnapshotCache } from "./session-snapshot-cache";

export interface ProvidersSnapshot {
  providers: ProviderRecord[];
  types: ProviderType[];
  schemas: Record<ProviderType, ProviderField[]>;
  /** 「providerId|model」；无默认时为 null */
  defaultModelKey: string | null;
  updatedAt: number;
}

const EMPTY_SCHEMAS: Record<ProviderType, ProviderField[]> = {
  openai: [],
  claude: [],
  gemini: [],
  aihubmix: [],
  cloudflare: [],
  deepl: [],
};

function encodeModelKey(providerId: string, model: string): string {
  return `${providerId}|${model}`;
}

function isProvidersSnapshot(value: unknown): value is ProvidersSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.updatedAt === "number" &&
    Array.isArray(v.providers) &&
    Array.isArray(v.types) &&
    v.schemas !== null &&
    typeof v.schemas === "object" &&
    (v.defaultModelKey === null || typeof v.defaultModelKey === "string")
  );
}

const cache = createSessionSnapshotCache<ProvidersSnapshot>({
  storageKey: "ot.dashboard.providers.v1",
  isSnapshot: isProvidersSnapshot,
  async fetchFresh() {
    const [listRes, schemaRes, setRes] = await Promise.all([
      apiGet<{ providers: ProviderRecord[]; types: ProviderType[] }>(
        "/api/admin/providers",
      ),
      apiGet<{ schemas: Record<ProviderType, ProviderField[]> }>(
        "/api/admin/providers/schema",
      ),
      apiGet<{ settings: SiteSettings }>("/api/admin/settings"),
    ]);
    const pdm = setRes.settings.defaultModel;
    return {
      providers: listRes.providers,
      types: listRes.types,
      schemas: schemaRes.schemas,
      defaultModelKey: pdm ? encodeModelKey(pdm.providerId, pdm.model) : null,
      updatedAt: Date.now(),
    };
  },
});

export function getProvidersSnapshot(): ProvidersSnapshot | null {
  return cache.get();
}

export function loadProvidersSnapshot(opts?: {
  force?: boolean;
}): Promise<ProvidersSnapshot> {
  return cache.load(opts);
}

/** 乐观更新或本地 patch 后写回缓存（保留 types/schemas）。 */
export function patchProvidersSnapshot(
  patch: Partial<
    Pick<ProvidersSnapshot, "providers" | "defaultModelKey" | "schemas" | "types">
  >,
  expectedGen: number,
): void {
  const cur = cache.get();
  if (!cur) return;
  cache.set(
    {
      ...cur,
      ...patch,
      updatedAt: Date.now(),
    },
    expectedGen,
  );
}

/** 发起写操作前捕获代际。 */
export function beginProvidersWrite(): number {
  return cache.currentGeneration();
}

export function clearProvidersSnapshot(): void {
  cache.clear();
}

export { EMPTY_SCHEMAS };
