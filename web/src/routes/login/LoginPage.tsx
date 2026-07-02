import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { AuthUser } from "@opentranslator/shared-types";
import { ApiError, apiPost } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function LoginPage() {
  const { user, loading, setupCompleted, refresh } = useAuth();
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

  const isLogin = mode === "login";
  const canSetup = !setupCompleted;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise rounded-xl border border-rule bg-card p-7 shadow-md">
        <h1 className="font-display mb-5 text-center text-xl font-semibold tracking-tight">
          {isLogin ? "登录控制台" : "初始化管理员"}
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="h-10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">
              密码{!isLogin ? "（至少 8 位）" : ""}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? undefined : 8}
              className="h-10"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="mt-1 h-10 w-full"
            disabled={submitting}
          >
            {submitting ? "提交中…" : isLogin ? "登录" : "创建并登录"}
          </Button>
        </form>

        {canSetup && (
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? "setup" : "login");
              setError(null);
            }}
            className="mx-auto mt-5 block text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {isLogin ? "首次使用？初始化管理员 →" : "← 返回登录"}
          </button>
        )}
      </div>
    </div>
  );
}
