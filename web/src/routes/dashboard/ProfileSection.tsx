import { useEffect, useRef, useState } from "react";
import type {
  UpdateAvatarResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@opentranslator/shared-types";
import { apiDelete, apiPut, apiUploadAvatar, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { validateAvatarFile } from "@/lib/avatar";
import { useOnceAnimation } from "@/lib/useOnceAnimation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export function ProfileSection() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const rise = useOnceAnimation(true, 650);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError(t("profile.emailRequired"));
      return;
    }
    if (!currentPassword) {
      setError(t("profile.passwordRequired"));
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError(t("profile.passwordMin"));
      return;
    }

    if (!user) return;
    const emailChanged = email.trim() !== user.email;
    const passwordChanging = !!newPassword;
    if (!emailChanged && !passwordChanging) {
      setError(t("profile.noChanges"));
      return;
    }

    const body: UpdateProfileRequest = {
      email: email.trim(),
      currentPassword,
    };
    if (newPassword) body.newPassword = newPassword;

    setSaving(true);
    setError(null);
    try {
      const res = await apiPut<UpdateProfileResponse>("/api/admin/profile", body);
      setCurrentPassword("");
      setNewPassword("");
      if (res.changed) {
        await refresh({ silent: true });
        toast.success(t("profile.updated"));
      } else {
        toast.info(t("common.noChanges"));
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    const validated = await validateAvatarFile(file);
    if (!validated.ok) {
      toast.error(validated.error);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    setAvatarBusy(true);
    try {
      await apiUploadAvatar<UpdateAvatarResponse>(file);
      setPreviewUrl(null);
      await refresh({ silent: true });
      toast.success(t("profile.avatarUpdated"));
    } catch (err) {
      setPreviewUrl(null);
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!user?.avatarUrl) return;
    setAvatarBusy(true);
    try {
      await apiDelete<UpdateAvatarResponse>("/api/admin/profile/avatar");
      setPreviewUrl(null);
      await refresh({ silent: true });
      toast.success(t("profile.avatarRemoved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!user) return null;

  const displayUser = previewUrl
    ? { ...user, avatarUrl: previewUrl }
    : user;

  return (
    <Card className={cn(rise && "animate-rise motion-reduce:animate-none")}>
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          <div className="flex flex-col items-center gap-3 sm:w-44 sm:shrink-0">
            <UserAvatar
              user={displayUser}
              className="size-24 ring-1 ring-rule"
              fallbackClassName="text-lg"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onAvatarSelected(e)}
            />
            <div className="flex flex-col items-stretch gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarBusy}
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                {avatarBusy ? t("common.processing") : t("profile.uploadAvatar")}
              </Button>
              {user.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={avatarBusy}
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => void removeAvatar()}
                >
                  <Trash2 className="size-4" />
                  {t("profile.removeAvatar")}
                </Button>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {t("profile.avatarHint")}
            </p>
          </div>

          <form
            onSubmit={submit}
            className="flex min-w-0 flex-1 flex-col gap-4 sm:border-l sm:border-rule sm:pl-8"
          >
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">{t("auth.email")}</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-current-password">{t("profile.currentPassword")}</Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-new-password">{t("profile.newPassword")}</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder={t("profile.passwordPlaceholder")}
              />
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? (
                  t("common.saving")
                ) : (
                  <>
                    <Check className="size-4" />
                    {t("common.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
