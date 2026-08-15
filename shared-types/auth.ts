export type UserRole = "admin" | "user";

/** 管理员可分配给普通用户的权限。管理员隐式拥有全部权限。 */
export const USER_PERMISSIONS = [
  "translate",
  "write",
  "providers",
  "settings",
  "usage",
] as const;

export type UserPermission = (typeof USER_PERMISSIONS)[number];

export const DEFAULT_USER_PERMISSIONS: UserPermission[] = ["translate", "write"];

export function isAdminRole(role: string): boolean {
  return role === "admin";
}

export function parseUserPermissions(raw: unknown): UserPermission[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(USER_PERMISSIONS);
  const out: UserPermission[] = [];
  for (const item of raw) {
    if (typeof item === "string" && allowed.has(item) && !out.includes(item as UserPermission)) {
      out.push(item as UserPermission);
    }
  }
  return out;
}

export function parseUserPermissionsJson(raw: string | null | undefined): UserPermission[] {
  if (!raw) return [];
  try {
    return parseUserPermissions(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function hasPermission(
  user: Pick<AuthUser, "role" | "permissions"> | null | undefined,
  permission: UserPermission,
): boolean {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return user.permissions.includes(permission);
}

/** 匿名走站点公开开关；已登录则看具体权限。 */
export function canUseFeature(
  user: Pick<AuthUser, "role" | "permissions"> | null | undefined,
  sitePublic: boolean,
  permission: UserPermission,
): boolean {
  if (user) return hasPermission(user, permission);
  return sitePublic;
}

export function userLoginName(user: Pick<AuthUser, "username" | "email">): string {
  return user.username || user.email;
}

export interface AuthUser {
  id: string;
  /** 登录名；可以是邮箱也可以是普通用户名。 */
  username: string;
  /**
   * 与 username 相同。保留给扩展等旧客户端。
   * @deprecated 使用 username
   */
  email: string;
  role: UserRole;
  permissions: UserPermission[];
  enabled: boolean;
  /** 自定义头像 URL（含 cache-bust 参数）；无头像时省略。 */
  avatarUrl?: string;
}

export interface LoginRequest {
  password: string;
  username?: string;
  /** @deprecated 与 username 相同；兼容旧客户端 */
  email?: string;
}

export interface SetupRequest extends LoginRequest {}

/** POST /api/auth/login and /api/auth/setup — includes token for Bearer clients (e.g. extension). */
export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser;
  /** JWT for non-cookie clients. Same value as the `ot_session` cookie. */
  token: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: AuthUser;
  /** 是否已完成首次管理员初始化。未完成时前端强制进入 /setup。 */
  setupCompleted: boolean;
  /** 站点是否公开访问。私有模式下未登录访客会被前端重定向到登录页。 */
  sitePublic: boolean;
}

/** Stored in D1 as `pbkdf2$iterations$saltB64$hashB64`. */
export type PasswordHash = string;

export interface UpdateProfileRequest {
  currentPassword: string;
  username?: string;
  /** @deprecated 与 username 相同 */
  email?: string;
  newPassword?: string;
}

export interface UpdateProfileResponse {
  user: AuthUser;
  changed: boolean;
}

export interface UpdateAvatarResponse {
  user: AuthUser;
}

/** Dashboard 用户列表项；不含密码哈希。 */
export interface ManagedUser {
  id: string;
  username: string;
  role: UserRole;
  permissions: UserPermission[];
  enabled: boolean;
  createdAt: number | null;
}

export interface ManagedUserListResponse {
  users: ManagedUser[];
}

export interface CreateManagedUserRequest {
  username: string;
  password: string;
  permissions?: UserPermission[];
}

export interface CreateManagedUserResponse {
  user: ManagedUser;
}

export interface UpdateManagedUserRequest {
  username?: string;
  password?: string;
  permissions?: UserPermission[];
  enabled?: boolean;
}

/** @deprecated 使用 ManagedUser */
export type AdminAccount = ManagedUser;
/** @deprecated 使用 ManagedUserListResponse */
export type AdminAccountListResponse = ManagedUserListResponse;
/** @deprecated 使用 CreateManagedUserRequest */
export type CreateAdminRequest = CreateManagedUserRequest;
/** @deprecated 使用 CreateManagedUserResponse */
export type CreateAdminResponse = CreateManagedUserResponse;
export interface ResetAdminPasswordRequest {
  password: string;
}
