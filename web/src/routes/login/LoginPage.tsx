import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { AuthUser } from "@opentranslator/shared-types";
import { ApiError, apiPost } from "../../lib/api-client";
import { useAuth } from "../../lib/auth";

export function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/setup";
      const res = await apiPost<{ user: AuthUser }>(path, { email, password });
      await refresh();
      void res;
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>{mode === "login" ? "登录控制台" : "初始化管理员"}</h1>
        <p className="subtitle">
          {mode === "login"
            ? "登录以管理供应商与站点设置。"
            : "首次使用：创建第一个管理员账号。"}
        </p>

        <label className="field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>密码{mode === "setup" ? "（至少 8 位）" : ""}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "setup" ? 8 : undefined}
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "提交中…" : mode === "login" ? "登录" : "创建并登录"}
        </button>

        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === "login" ? "setup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "首次使用？初始化管理员 →" : "← 返回登录"}
        </button>
      </form>
    </div>
  );
}
