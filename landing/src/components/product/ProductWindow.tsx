import type { ReactNode } from "react";
import { useContent } from "@/lib/i18n";

type ProductWindowProps = {
  title: string;
  children: ReactNode;
};

/** Product window chrome around presentational app surfaces. */
export function ProductWindow({ title, children }: ProductWindowProps) {
  const { gallery } = useContent();

  return (
    <div className="product-window">
      <div className="window-chrome" aria-hidden="true">
        <div className="window-traffic">
          <span className="dot red" />
          <span className="dot amber" />
          <span className="dot green" />
        </div>
        <div className="window-title">{title}</div>
        <div className="window-chrome-end">{gallery.windowBadge}</div>
      </div>
      <div className="gallery-frame">{children}</div>
    </div>
  );
}
