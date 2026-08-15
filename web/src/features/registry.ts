import type { ComponentType } from "react";
import { PublicAccessSettings } from "./PublicAccessSettings";
import { AiExpertsManager } from "./AiExpertsManager";
import { MultiUserManager } from "./MultiUserManager";
import type { FeatureKey } from "./keys";

/**
 * Frontend feature registry. The Dashboard fetches feature manifests from
 * /api/admin/features and renders the component registered here for each
 * enabled feature key. New feature = add a page + register a line here,
 * plus a prefetcher in `prefetch.ts` (`FeatureKey` must be exhaustive in both).
 */
export const featureComponents: Record<FeatureKey, ComponentType> = {
  "public-access": PublicAccessSettings,
  "ai-experts": AiExpertsManager,
  "multi-user": MultiUserManager,
};
