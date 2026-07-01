import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { TranslatorPage } from "./routes/translator/TranslatorPage";
import { DashboardPage } from "./routes/dashboard/DashboardPage";
import { LoginPage } from "./routes/login/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <TranslatorPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "login", element: <LoginPage /> },
    ],
  },
]);
