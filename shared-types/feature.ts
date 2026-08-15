import type { AuthUser, UserPermission } from "./auth";
import { hasPermission, isAdminRole } from "./auth";

/** 功能模块出现在控制台 / 可被开关时所需的访问级别。缺省视为 settings。 */
export type FeatureAccess = UserPermission | "admin";

export interface FeatureManifest {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  adminRoute?: string;
  requiredAccess?: FeatureAccess;
}

export function canAccessFeature(
  user: Pick<AuthUser, "role" | "permissions"> | null | undefined,
  access: FeatureAccess | undefined,
): boolean {
  const need = access ?? "settings";
  if (need === "admin") return isAdminRole(user?.role ?? "");
  return hasPermission(user, need);
}