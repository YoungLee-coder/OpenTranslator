export interface AuthUser {
  id: string;
  email: string;
  role: string;
  /** 自定义头像 URL（含 cache-bust 参数）；无头像时省略。 */
  avatarUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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
  /** 是否已完成首次管理员初始化。登录页据此决定是否展示「初始化」入口。 */
  setupCompleted: boolean;
  /** 站点是否公开访问。私有模式下未登录访客会被前端重定向到登录页。 */
  sitePublic: boolean;
}

/** Stored in D1 as `pbkdf2$iterations$saltB64$hashB64`. */
export type PasswordHash = string;

export interface UpdateProfileRequest {
  email?: string;
  currentPassword: string;
  newPassword?: string;
}

export interface UpdateProfileResponse {
  user: AuthUser;
  changed: boolean;
}

export interface UpdateAvatarResponse {
  user: AuthUser;
}
