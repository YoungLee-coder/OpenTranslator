import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";
import { ThemeProvider, resolveInitialTheme } from "./components/theme-provider";
import { LocaleProvider, resolveInitialLocale } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

// 预置主题 class，避免首帧闪烁（FOUC）
const initialTheme = resolveInitialTheme();
document.documentElement.classList.toggle("dark", initialTheme === "dark");
document.documentElement.style.colorScheme = initialTheme;
document.documentElement.lang = resolveInitialLocale();

ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </React.StrictMode>,
);
