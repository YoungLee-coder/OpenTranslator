import type { ReactNode } from "react";

type ProductWindowProps = {
  title: string;
  children: ReactNode;
};

/** Cursor-style product window chrome around presentational app surfaces. */
export function ProductWindow({ title, children }: ProductWindowProps) {
  return (
    <div className="product-stage">
      <div className="product-window">
        <div className="window-chrome" aria-hidden="true">
          <div className="window-traffic">
            <span className="dot red" />
            <span className="dot amber" />
            <span className="dot green" />
          </div>
          <div className="window-title">{title}</div>
          <div className="window-chrome-end">Web</div>
        </div>
        <div className="gallery-frame">{children}</div>
      </div>
    </div>
  );
}
