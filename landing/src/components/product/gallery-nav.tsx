import { createContext, useContext, type ReactNode } from "react";
import type { GallerySlideId } from "@/content";

export type GalleryNavValue = {
  activeId: GallerySlideId;
  goTo: (id: GallerySlideId) => void;
};

const GalleryNavContext = createContext<GalleryNavValue | null>(null);

export function GalleryNavProvider({
  value,
  children,
}: {
  value: GalleryNavValue;
  children: ReactNode;
}) {
  return (
    <GalleryNavContext.Provider value={value}>
      {children}
    </GalleryNavContext.Provider>
  );
}

export function useGalleryNav(): GalleryNavValue | null {
  return useContext(GalleryNavContext);
}
