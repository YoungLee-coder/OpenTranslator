export const FEATURE_KEYS = ["public-access", "ai-experts", "multi-user"] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key);
}
