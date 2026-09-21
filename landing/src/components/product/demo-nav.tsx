import { createContext, useContext, type ReactNode } from "react";
import type { CaptionKey, DashboardTabId, DemoRoute, DemoView } from "@/content";

export type { CaptionKey, DashboardTabId, DemoRoute, DemoView };

export function captionKey(route: DemoRoute): CaptionKey {
  return route.view === "dashboard" ? route.tab : route.view;
}

export function sameRoute(a: DemoRoute, b: DemoRoute): boolean {
  if (a.view !== b.view) return false;
  if (a.view === "dashboard" && b.view === "dashboard") return a.tab === b.tab;
  return true;
}

export type DemoNavValue = {
  route: DemoRoute;
  /** Top-level navigation (translate / write / dashboard). */
  go: (view: DemoView) => void;
  /** Dashboard tab navigation. */
  openTab: (tab: DashboardTabId) => void;
  /** Mock app theme; the real app's toggle is global, so this is too. */
  dark: boolean;
  toggleDark: () => void;
};

const DemoNavContext = createContext<DemoNavValue | null>(null);

export function DemoNavProvider({
  value,
  children,
}: {
  value: DemoNavValue;
  children: ReactNode;
}) {
  return (
    <DemoNavContext.Provider value={value}>{children}</DemoNavContext.Provider>
  );
}

export function useDemoNav(): DemoNavValue | null {
  return useContext(DemoNavContext);
}
