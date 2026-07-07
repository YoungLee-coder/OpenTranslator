import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import type { AuthUser, PingResponse } from "@opentranslator/shared-types";
import { Ellipsis, Languages, LayoutDashboard, LogOut, Moon, PenLine, Sun, X } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LanguageMenuButton, LanguageMenuItems } from "@/components/LanguageMenu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-[1.06]",
        )}
      >
        <Languages className="size-3.5" />
      </span>
      {!compact && (
        <span className="hidden font-display text-[0.95rem] font-semibold tracking-tight md:inline">
          OpenTranslator
        </span>
      )}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={toggle}
          aria-label={t("theme.toggle")}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{theme === "dark" ? t("theme.light") : t("theme.dark")}</TooltipContent>
    </Tooltip>
  );
}

export function RootLayout() {
  const { user, loading: authLoading, sitePublic, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // 绑定检测：DB / KV 未绑定时强制跳转初始化错误页。ping 不触碰 DB/KV，
  // 可在 auth 流程之前安全执行；与 auth 并行，两者任一未就绪都显示加载态。
  const [bindingCheck, setBindingCheck] = useState<
    "loading" | "ok" | "missing"
  >("loading");

  useEffect(() => {
    apiGet<PingResponse>("/api/ping")
      .then((res) => {
        setBindingCheck(
          res.bindings?.db && res.bindings?.kv ? "ok" : "missing",
        );
      })
      .catch(() => setBindingCheck("missing"));
  }, []);

  useEffect(() => {
    setMobileExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileExpanded]);

  if (authLoading || bindingCheck === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-transparent" />
          {t("common.loading")}
        </div>
      </div>
    );
  }
  if (bindingCheck === "missing") {
    return <Navigate to="/setup-required" replace />;
  }
  if (!sitePublic && !user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  const closeMobile = () => setMobileExpanded(false);

  const desktopNav = (
    <>
      <PillLink to="/" label={t("nav.translate")} active={location.pathname === "/"} />
      <PillLink to="/write" label={t("nav.write")} active={location.pathname === "/write"} />
      {user ? (
        <PillLink
          to="/dashboard"
          label={t("nav.dashboard")}
          active={location.pathname.startsWith("/dashboard")}
        />
      ) : (
        <PillLink to="/login" label={t("nav.login")} active={location.pathname === "/login"} />
      )}
    </>
  );

  return (
    <div className="flex min-h-svh flex-col">
      {/* 胶囊悬浮 header：居中、圆角描边、轻玻璃，叠在内容上方 */}
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {/* 移动端：灵动岛式胶囊展开 */}
        <MobileIslandCapsule
          expanded={mobileExpanded}
          onExpandedChange={setMobileExpanded}
          location={location}
          user={user}
          onLogout={() => {
            closeMobile();
            void logout();
          }}
        />

        {/* 桌面端：单行药丸导航 */}
        <div className="hidden h-12 w-fit max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full border border-rule bg-card/80 px-2 shadow-md backdrop-blur-md md:flex">
          <BrandMark />

          <span className="mx-1 h-6 w-px bg-rule" />

          <nav className="flex items-center gap-1">
            {desktopNav}
          </nav>

          <span className="mx-1 h-6 w-px bg-rule" />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!user && <LanguageMenuButton />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    aria-label={t("user.menu")}
                  >
                    <UserAvatar user={user} className="size-8 ring-1 ring-rule" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <LanguageMenuItems />
                  <DropdownMenuItem
                    onSelect={() => void logout()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut /> {t("user.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-5 pb-[max(3.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 md:pt-10">
        <Outlet />
      </main>
    </div>
  );
}

function MobileIslandCapsule({
  expanded,
  onExpandedChange,
  location,
  user,
  onLogout,
}: {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  location: ReturnType<typeof useLocation>;
  user: AuthUser | null;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const close = () => onExpandedChange(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        className={cn(
          "fixed inset-0 z-30 bg-foreground/10 transition-opacity duration-200 motion-reduce:transition-none",
          expanded
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-label={t("common.close")}
        aria-hidden={!expanded}
        tabIndex={expanded ? 0 : -1}
        onClick={close}
      />

      <div
        className={cn(
          "relative z-40 inline-flex flex-col overflow-hidden rounded-[1.75rem] border border-rule bg-card/95 shadow-md [contain:layout] transition-[width,box-shadow] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          // 固定两态宽度而非 w-max：容器是收缩自适应（shrink-to-fit），
          // % 单位相对它的百分比会因循环依赖被浏览器忽略退化为内容宽度，
          // 且面板即便折叠为 0fr 行高，其内容仍会撑大 max-content 的宽度计算，
          // 导致收起态出现右侧留白、展开态宽度也不会真正过渡。改用 vw 计算避开循环依赖。
          // 圆角用固定值而非 rounded-full：50% 在宽高接近时会变成正圆中间态。
          expanded ? "w-[min(calc(100vw-2rem),18.5rem)] shadow-xl ring-1 ring-rule/40" : "w-36",
        )}
      >
        <div className="flex h-11 shrink-0 items-center gap-0.5 px-2">
          <BrandMark compact />
          <div className="grid w-[6rem] shrink-0 grid-cols-3 items-center">
            <div className="flex justify-center [&_button]:size-8 [&_button]:rounded-full">
              <ThemeToggle />
            </div>
            <div className="flex justify-center [&_button]:size-8 [&_button]:rounded-full">
              <LanguageMenuButton />
            </div>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? t("common.close") : t("nav.more")}
                className="size-8 rounded-full"
                onClick={() => onExpandedChange(!expanded)}
              >
                {expanded ? <X className="size-4" /> : <Ellipsis className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid min-w-0 transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="border-t border-rule/70 px-2.5 pb-3 pt-2">
              <nav className="flex flex-col gap-0.5">
                <IslandNavLink
                  to="/"
                  label={t("nav.translate")}
                  icon={<Languages className="size-4" />}
                  active={location.pathname === "/"}
                  onGo={close}
                />
                <IslandNavLink
                  to="/write"
                  label={t("nav.write")}
                  icon={<PenLine className="size-4" />}
                  active={location.pathname === "/write"}
                  onGo={close}
                />
                {user ? (
                  <IslandNavLink
                    to="/dashboard"
                    label={t("nav.dashboard")}
                    icon={<LayoutDashboard className="size-4" />}
                    active={location.pathname.startsWith("/dashboard")}
                    onGo={close}
                  />
                ) : (
                  <IslandNavLink
                    to="/login"
                    label={t("nav.login")}
                    active={location.pathname === "/login"}
                    onGo={close}
                  />
                )}
              </nav>

              {user ? (
                <div className="mt-3 border-t border-rule/70 pt-3">
                  <div className="mb-2.5 flex items-center gap-2.5 px-1">
                    <UserAvatar user={user} className="size-8 ring-1 ring-rule" />
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full gap-2 rounded-xl"
                    onClick={onLogout}
                  >
                    <LogOut className="size-3.5" />
                    {t("user.logout")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PillLink({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-8 items-center rounded-full px-3.5 text-[0.825rem] font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function IslandNavLink({
  to,
  label,
  icon,
  active,
  onGo,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onGo: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onGo}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
