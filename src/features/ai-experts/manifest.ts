import type { FeatureManifest } from "@opentranslator/shared-types";

export const aiExpertsManifest: FeatureManifest = {
  key: "ai-experts",
  name: "AI 专家",
  description: "沉浸式翻译 AI 专家模式：按场景选用专业翻译策略，替代术语库",
  enabled: false,
  adminRoute: "/dashboard/ai-experts",
};
