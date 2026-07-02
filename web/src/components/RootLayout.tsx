import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Languages, LayoutDashboard, LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={toggle}
          aria-label="切换主题"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{theme === "dark" ? "浅色" : "深色"}</TooltipContent>
    </Tooltip>
  );
}

function initialsOf(email: string): string {
  const head = email.split("@")[0] ?? email;
  return head.slice(0, 2).toUpperCase();
}

export function RootLayout() {
  const { user, loading, sitePublic, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 私有站点守卫：未登录访客访问任意页面（login 除外）一律重定向到登录页。
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-transparent" />
          加载中…
        </div>
      </div>
    );
  }
  if (!sitePublic && !user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  const navLinks = user ? (
    <>
      <NavLink to="/" label="翻译" icon={<Languages className="size-4" />} active={location.pathname === "/"} onGo={() => setMobileOpen(false)} />
      <NavLink to="/dashboard" label="控制台" icon={<LayoutDashboard className="size-4" />} active={location.pathname.startsWith("/dashboard")} onGo={() => setMobileOpen(false)} />
    </>
  ) : (
    <NavLink to="/login" label="登录" active={location.pathname === "/login"} onGo={() => setMobileOpen(false)} />
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
            <PillLink to="/" label="翻译" active={location.pathname === "/"} />
            {user ? (
              <PillLink
                to="/dashboard"
                label="控制台"
                active={location.pathname.startsWith("/dashboard")}
              />
            ) : (
              <PillLink
                to="/login"
                label="登录"
                active={location.pathname === "/login"}
              />
            )}
          </nav>

          <span className="mx-1 hidden h-6 w-px bg-rule md:block" />

          <div className="hidden items-center gap-1 md:flex">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    aria-label="用户菜单"
                  >
                    <Avatar className="size-8 ring-1 ring-rule">
                      <AvatarFallback className="text-[0.7rem]">
                        {initialsOf(user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard /> 控制台
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => void logout()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {/* 移动端：主题 + 汉堡 */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="菜单" className="size-9 rounded-full">
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
