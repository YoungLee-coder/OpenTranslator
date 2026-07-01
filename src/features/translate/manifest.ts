import type { FeatureManifest } from "@opentranslator/shared-types";

export const translateManifest: FeatureManifest = {
  key: "translate",
  name: "翻译",
  description: "核心文本翻译能力",
  enabled: true,
  adminRoute: "/dashboard/translate",
};
