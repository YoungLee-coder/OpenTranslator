import type { FeatureManifest } from "@opentranslator/shared-types";
import { publicAccessManifest } from "./public-access/manifest";
import { aiExpertsManifest } from "./ai-experts/manifest";
import { multiUserManifest } from "./multi-user/manifest";

/** 后端功能模块清单。admin-features 与 backup 导入白名单共用，新增模块只改这里。 */
export const featureManifests: FeatureManifest[] = [
  publicAccessManifest,
  aiExpertsManifest,
  multiUserManifest,
];
