import type { FeatureManifest } from "@opentranslator/shared-types";

export const multiUserManifest: FeatureManifest = {
  key: "multi-user",
  name: "多用户管理",
  description: "管理员可创建普通用户、分配权限并启用/停用账号；全站仅一名管理员",
  enabled: false,
  adminRoute: "/dashboard/multi-user",
  requiredAccess: "admin",
};
