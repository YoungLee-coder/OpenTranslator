import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import type { PingResponse } from "@opentranslator/shared-types";
import { Languages, LayoutDashboard, LogOut, Menu, Moon, PenLine, Sun } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LanguageMenuButton, LanguageMenuItems } from "@/components/LanguageMenu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-[1.06]">
        <Languages className="size-3.5" />
      </span>
      {!compact && (
        <span className="font-display text-[0.95rem] font-semibold tracking-tight">
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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const navLinks = (
    <>
      <NavLink to="/" label={t("nav.translate")} icon={<Languages className="size-4" />} active={location.pathname === "/"} onGo={() => setMobileOpen(false)} />
      <NavLink to="/write" label={t("nav.write")} icon={<PenLine className="size-4" />} active={location.pathname === "/write"} onGo={() => setMobileOpen(false)} />
      {user ? (
        <NavLink to="/dashboard" label={t("nav.dashboard")} icon={<LayoutDashboard className="size-4" />} active={location.pathname.startsWith("/dashboard")} onGo={() => setMobileOpen(false)} />
      ) : (
        <NavLink to="/login" label={t("nav.login")} active={location.pathname === "/login"} onGo={() => setMobileOpen(false)} />
      )}
    </>
  );

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
      <header className="sticky top-3 z-40 flex justify-center px-4">
        <div className="flex h-12 w-fit max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full border border-rule bg-card/80 px-2 shadow-md backdrop-blur-md">
          <BrandMark />

          {/* 分隔发丝 */}
          <span className="mx-1 h-6 w-px bg-rule" />

          {/* 桌面导航：药丸式 active */}
          <nav className="hidden items-center gap-1 md:flex">
            {desktopNav}
          </nav>

          <span className="mx-1 hidden h-6 w-px bg-rule md:block" />

          <div className="hidden items-center gap-1 md:flex">
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

          {/* 移动端：主题 + 汉堡 */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <LanguageMenuButton />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("nav.menu")} className="size-9 rounded-full">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Languages className="size-3.5" />
                    </span>
                    OpenTranslator
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navLinks}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-8 pb-14 sm:px-6 sm:pt-10">
        <Outlet />
      </main>
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

function NavLink({
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
    <SheetClose asChild>
      <Link
        to={to}
        onClick={onGo}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
        )}
      >
        {icon}
        {label}
      </Link>
    </SheetClose>
  );
}
