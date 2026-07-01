import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { AuthUser } from "@opentranslator/shared-types";
import { ApiError, apiPost } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const isLogin = mode === "login";

  return (
    <div className="flex justify-center pt-10 md:pt-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {isLogin ? "登录控制台" : "初始化管理员"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "登录以管理供应商与站点设置。"
              : "首次使用：创建第一个管理员账号。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
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
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "提交中…" : isLogin ? "登录" : "创建并登录"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setMode(isLogin ? "setup" : "login");
              setError(null);
            }}
          >
            {isLogin ? "首次使用？初始化管理员 →" : "← 返回登录"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
