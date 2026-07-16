import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type { AuthUser } from "@opentranslator/shared-types";
import { ApiError, apiPost } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function LoginPage() {
  const { user, loading, setupCompleted, refresh } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "setup">(
    searchParams.get("setup") === "1" ? "setup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      </div>
    );
  }
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
          {isLogin ? t("auth.loginTitle") : t("auth.setupTitle")}
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
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
              {t("auth.password")}{!isLogin ? t("auth.passwordMin") : ""}
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
            {submitting ? t("common.submitting") : isLogin ? t("auth.login") : t("auth.createAndLogin")}
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
            {isLogin ? t("auth.firstUseSetup") : t("auth.backToLogin")}
          </button>
        )}
      </div>
    </div>
  );
}
