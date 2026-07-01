export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SetupRequest extends LoginRequest {}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: AuthUser;
}

/** Stored in D1 as `pbkdf2$iterations$saltB64$hashB64`. */
export type PasswordHash = string;
