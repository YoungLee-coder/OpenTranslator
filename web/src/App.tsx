import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { TranslatorPage } from "./routes/translator/TranslatorPage";
import { WritePage } from "./routes/write/WritePage";
import { DashboardPage } from "./routes/dashboard/DashboardPage";
import { LoginPage } from "./routes/login/LoginPage";
import { SetupRequiredPage } from "./routes/setup-required/SetupRequiredPage";

export const router = createBrowserRouter([
  {
    // DB / KV 未绑定时强制跳转的提示页（独立顶层路由，不走 RootLayout）。
    path: "/setup-required",
    element: <SetupRequiredPage />,
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
