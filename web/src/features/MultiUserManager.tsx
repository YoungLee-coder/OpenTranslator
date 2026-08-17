import { useEffect, useState } from "react";
import type {
  CreateManagedUserResponse,
  ManagedUser,
  ProviderRecord,
  UserPermission,
} from "@opentranslator/shared-types";
import {
  DEFAULT_USER_PERMISSIONS,
  EMPTY_USER_USAGE,
  isAdminRole,
  USER_PERMISSIONS,
} from "@opentranslator/shared-types";
import { apiDelete, apiPost, apiPut, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import {
  getProvidersSnapshot,
  loadProvidersSnapshot,
} from "@/lib/dashboard-providers-cache";
import {
  beginMultiUserWrite,
  getMultiUserSnapshot,
  loadMultiUserSnapshot,
  setMultiUserSnapshot,
} from "./multi-user-cache";
import { useTranslation } from "@/lib/i18n";
import type { MessageKey } from "@/locales/zh-CN";
import { ProviderIcon } from "@/components/ProviderIcon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, AlertCircle, FileText, KeyRound, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const PERM_LABEL: Record<UserPermission, MessageKey> = {
  translate: "users.perm.translate",
  write: "users.perm.write",
  providers: "users.perm.providers",
  settings: "users.perm.settings",
  usage: "users.perm.usage",
};

function PermissionList({
  value,
  onChange,
  disabled,
}: {
  value: Set<UserPermission>;
  onChange: (next: Set<UserPermission>) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-rule p-3">
      {USER_PERMISSIONS.map((perm) => (
        <label key={perm} className="flex items-center justify-between gap-3 text-sm">
          <span>{t(PERM_LABEL[perm])}</span>
          <Switch
            checked={value.has(perm)}
            disabled={disabled}
            onCheckedChange={(on) => {
              const next = new Set(value);
              if (on) next.add(perm);
              else next.delete(perm);
              onChange(next);
            }}
            aria-label={t(PERM_LABEL[perm])}
          />
        </label>
      ))}
    </div>
  );
}

/** 多用户管理：普通用户的创建、权限、启用/停用。全站仅一名管理员。 */
export function MultiUserManager() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const initial = getMultiUserSnapshot();
  const [users, setUsers] = useState<ManagedUser[]>(() => initial?.users ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !initial);

  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addPerms, setAddPerms] = useState<Set<UserPermission>>(
    () => new Set(DEFAULT_USER_PERMISSIONS),
  );
  const [adding, setAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [editPerms, setEditPerms] = useState<Set<UserPermission>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [usageTarget, setUsageTarget] = useState<ManagedUser | null>(null);
  const [usageProviders, setUsageProviders] = useState<ProviderRecord[]>(
    () => getProvidersSnapshot()?.providers ?? [],
  );
  const others = users.filter((u) => u.id !== me?.id);
  const usage = usageTarget?.usage ?? EMPTY_USER_USAGE;
  const usageProviderById = new Map(usageProviders.map((p) => [p.id, p]));
  const visibleUsageByProvider =
    usageProviders.length > 0
      ? (usage.byProvider ?? []).filter((p) => usageProviderById.has(p.providerId))
      : (usage.byProvider ?? []);

  function mapError(msg: string): string {
    switch (msg) {
      case "invalid username":
        return t("users.usernameInvalid");
      case "username already registered":
        return t("users.usernameTaken");
      case "cannot delete yourself":
        return t("users.cannotDeleteSelf");
      case "cannot delete the admin account":
        return t("users.cannotDeleteAdmin");
      case "cannot modify the admin account":
        return t("users.cannotModifyAdmin");
      case "user limit reached":
        return t("users.limitReached");
      case "use profile to change your own account":
        return t("users.useProfilePassword");
      case "multi-user feature is disabled":
        return t("users.featureDisabled");
      default:
        return msg;
    }
  }

  function commitUsers(
    updater: (prev: ManagedUser[]) => ManagedUser[],
    writeGen: number,
  ) {
    setUsers((prev) => {
      const next = updater(prev);
      setMultiUserSnapshot(next, writeGen);
      return next;
    });
  }

  async function load(opts?: { force?: boolean }) {
    try {
      const snap = await loadMultiUserSnapshot(opts);
      setUsers(snap.users);
      setError(null);
    } catch (e) {
      if (!getMultiUserSnapshot()) {
        setError(e instanceof ApiError ? mapError(e.message) : String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!me || !isAdminRole(me.role)) {
      setLoading(false);
      return;
    }
    void load();
  }, [me]);

  useEffect(() => {
    if (!usageTarget) return;
    let cancelled = false;
    void loadProvidersSnapshot()
      .then((snap) => {
        if (!cancelled) setUsageProviders(snap.providers);
      })
      .catch(() => {
        if (!cancelled) setUsageProviders(getProvidersSnapshot()?.providers ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [usageTarget]);

  function closeAdd() {
    if (adding) return;
    setAddOpen(false);
    setAddUsername("");
    setAddPassword("");
    setAddPerms(new Set(DEFAULT_USER_PERMISSIONS));
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const username = addUsername.trim();
    if (username.length < 2) {
      toast.error(t("users.usernameInvalid"));
      return;
    }
    if (addPassword.length < 8) {
      toast.error(t("users.passwordMin"));
      return;
    }
    setAdding(true);
    const writeGen = beginMultiUserWrite();
    try {
      const res = await apiPost<CreateManagedUserResponse>("/api/admin/users", {
        username,
        password: addPassword,
        permissions: [...addPerms],
      });
      commitUsers((prev) => [...prev, res.user], writeGen);
      toast.success(t("users.created"));
      setAddOpen(false);
      setAddUsername("");
      setAddPassword("");
      setAddPerms(new Set(DEFAULT_USER_PERMISSIONS));
    } catch (err) {
      toast.error(err instanceof ApiError ? mapError(err.message) : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const writeGen = beginMultiUserWrite();
    try {
      await apiDelete(`/api/admin/users/${deleteTarget.id}`);
      commitUsers(
        (prev) => prev.filter((u) => u.id !== deleteTarget.id),
        writeGen,
      );
      toast.success(t("users.deleted", { name: deleteTarget.username }));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? mapError(err.message) : String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPassword.length < 8) {
      toast.error(t("users.passwordMin"));
      return;
    }
    setResetting(true);
    const writeGen = beginMultiUserWrite();
    try {
      const res = await apiPut<{ user: ManagedUser }>(
        `/api/admin/users/${resetTarget.id}`,
        { password: resetPassword },
      );
      commitUsers(
        (prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)),
        writeGen,
      );
      toast.success(t("users.resetDone", { name: resetTarget.username }));
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? mapError(err.message) : String(err));
    } finally {
      setResetting(false);
    }
  }

  async function savePermissions() {
    if (!editTarget) return;
    setSavingPerms(true);
    const writeGen = beginMultiUserWrite();
    try {
      const res = await apiPut<{ user: ManagedUser }>(
        `/api/admin/users/${editTarget.id}`,
        { permissions: [...editPerms] },
      );
      commitUsers(
        (prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)),
        writeGen,
      );
      toast.success(t("users.permissionsSaved"));
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? mapError(err.message) : String(err));
    } finally {
      setSavingPerms(false);
    }
  }

  async function toggleEnabled(u: ManagedUser, enabled: boolean) {
    setBusyId(u.id);
    const writeGen = beginMultiUserWrite();
    try {
      const res = await apiPut<{ user: ManagedUser }>(`/api/admin/users/${u.id}`, {
        enabled,
      });
      commitUsers(
        (prev) => prev.map((row) => (row.id === res.user.id ? res.user : row)),
        writeGen,
      );
      toast.success(
        enabled
          ? t("users.enabledToast", { name: u.username })
          : t("users.disabledToast", { name: u.username }),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? mapError(err.message) : String(err));
    } finally {
      setBusyId(null);
    }
  }

  if (!me || !isAdminRole(me.role)) return null;

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t("users.title")}</CardTitle>
            <CardDescription>{t("users.description")}</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            {t("users.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : !error && others.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">{t("users.empty")}</p>
          </div>
        ) : (
          <div className="rounded-md border border-rule">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.username")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead>{t("users.status")}</TableHead>
                  <TableHead>{t("users.permissions")}</TableHead>
                  <TableHead className="text-right">{t("users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map((u) => {
                  const isAdmin = isAdminRole(u.role);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <span className="truncate" title={u.username}>
                          {u.username}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {isAdmin ? t("users.roleAdmin") : t("users.roleUser")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.enabled}
                            disabled={isAdmin || busyId === u.id}
                            onCheckedChange={(on) => void toggleEnabled(u, on)}
                            aria-label={t("users.toggleEnabled", { name: u.username })}
                          />
                          <span className="text-xs text-muted-foreground">
                            {u.enabled ? t("common.enabled") : t("common.disabled")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {isAdmin
                          ? t("users.allPermissions")
                          : u.permissions.length
                            ? u.permissions.map((p) => t(PERM_LABEL[p])).join("、")
                            : t("users.noPermissions")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5"
                            type="button"
                            onClick={() => setUsageTarget(u)}
                          >
                            <Activity className="size-3" />
                            <span className="hidden sm:inline">
                              {t("users.usage")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5"
                            type="button"
                            disabled={isAdmin}
                            onClick={() => {
                              setEditPerms(new Set(u.permissions));
                              setEditTarget(u);
                            }}
                          >
                            <Pencil className="size-3" />
                            <span className="hidden sm:inline">
                              {t("users.editPermissions")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5"
                            type="button"
                            disabled={isAdmin}
                            onClick={() => {
                              setResetPassword("");
                              setResetTarget(u);
                            }}
                          >
                            <KeyRound className="size-3" />
                            <span className="hidden sm:inline">
                              {t("users.resetPassword")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            type="button"
                            disabled={isAdmin}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="size-3" />
                            <span className="hidden sm:inline">
                              {t("common.delete")}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={(o) => !o && closeAdd()}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitAdd(e)}>
            <DialogHeader>
              <DialogTitle>{t("users.addTitle")}</DialogTitle>
              <DialogDescription>{t("users.addDesc")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-user-username">{t("users.username")}</Label>
                <Input
                  id="new-user-username"
                  type="text"
                  autoComplete="off"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  required
                  minLength={2}
                  maxLength={64}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-user-password">
                  {t("users.password")}
                  <span className="font-normal text-muted-foreground">
                    {t("auth.passwordMin")}
                  </span>
                </Label>
                <Input
                  id="new-user-password"
                  type="password"
                  autoComplete="new-password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("users.permissions")}</Label>
                <PermissionList value={addPerms} onChange={setAddPerms} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAdd} disabled={adding}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? t("common.submitting") : t("users.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("users.deleteDesc", { name: deleteTarget?.username ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? t("common.processing") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o && !resetting) {
            setResetTarget(null);
            setResetPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitReset(e)}>
            <DialogHeader>
              <DialogTitle>{t("users.resetTitle")}</DialogTitle>
              <DialogDescription>
                {t("users.resetDesc", { name: resetTarget?.username ?? "" })}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-user-password">
                  {t("users.password")}
                  <span className="font-normal text-muted-foreground">
                    {t("auth.passwordMin")}
                  </span>
                </Label>
                <Input
                  id="reset-user-password"
                  type="password"
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetTarget(null);
                  setResetPassword("");
                }}
                disabled={resetting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? t("common.saving") : t("users.resetPassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && !savingPerms && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.editPermissions")}</DialogTitle>
            <DialogDescription>
              {t("users.editPermissionsDesc", { name: editTarget?.username ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <PermissionList value={editPerms} onChange={setEditPerms} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={savingPerms}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void savePermissions()} disabled={savingPerms}>
              {savingPerms ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!usageTarget}
        onOpenChange={(o) => !o && setUsageTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("users.usageTitle")}</DialogTitle>
            <DialogDescription>
              {t("users.usageDesc", { name: usageTarget?.username ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
              <div className="flex flex-col gap-1.5 bg-card p-4">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Activity className="size-4" />
                </div>
                <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">
                  {usage.requests.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("overview.totalRequests")}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 bg-card p-4">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">
                  {usage.chars.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("overview.totalChars")}
                </div>
              </div>
            </div>
            {visibleUsageByProvider.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-rule">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("overview.provider")}</TableHead>
                      <TableHead className="text-right">
                        {t("overview.requests")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("overview.chars")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleUsageByProvider.map((p) => {
                      const provider = usageProviderById.get(p.providerId);
                      return (
                        <TableRow key={p.providerId}>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              {provider ? (
                                <ProviderIcon type={provider.type} size={16} />
                              ) : null}
                              {provider?.displayName ?? p.providerId}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.requests.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.chars.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : usage.requests === 0 ? (
              <p className="text-sm text-muted-foreground">{t("users.usageEmpty")}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUsageTarget(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
