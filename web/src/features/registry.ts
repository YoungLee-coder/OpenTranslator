import type { ComponentType } from "react";
import { TranslationSettings } from "./TranslationSettings";
import { GlossaryManager } from "./GlossaryManager";

/**
 * Frontend feature registry. The Dashboard fetches feature manifests from
 * /api/admin/features and renders the component registered here for each
 * enabled feature key. New feature = add a page + register a line.
 */
export const featureComponents: Record<string, ComponentType> = {
  translate: TranslationSettings,
  glossary: GlossaryManager,
};
