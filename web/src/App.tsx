import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { TranslatorPage } from "./routes/translator/TranslatorPage";
import { useTranslation } from "./lib/i18n";

// 次要路由懒加载，避免首屏拉 Dashboard / Write 等未用代码。
// 首页 Translator 保持同步：RootLayout 鉴权就绪后才挂 Outlet，
// 若首页也 lazy 会与 loading 串行，出现二次「加载中」闪烁。
const WritePage = lazy(() =>
  import("./routes/write/WritePage").then((m) => ({ default: m.WritePage })),
);
const DashboardPage = lazy(() =>
  import("./routes/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const LoginPage = lazy(() =>
  import("./routes/login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SetupRequiredPage = lazy(() =>
  import("./routes/setup-required/SetupRequiredPage").then((m) => ({
    default: m.SetupRequiredPage,
  })),
);

function LazyFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-rule border-t-transparent" />
      {t("common.loading")}
    </div>
  );
}

export const router = createBrowserRouter([
  {
    // DB / KV 未绑定时强制跳转的提示页（独立顶层路由，不走 RootLayout）。
    path: "/setup-required",
    element: (
      <Suspense fallback={<LazyFallback />}>
        <SetupRequiredPage />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <TranslatorPage /> },
      { path: "write", element: <WritePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
    ],
  },
]);
