import {
  LOGO_BADGE,
  LOGO_BADGE_HALO,
  LOGO_STAR_PATH,
  LOGO_TILE_FILL,
} from "./logo-paths";

/** `mark` — pure logo for in-app UI; `tile` — cream tile for favicon/marketing. */
export type LogoVariant = "mark" | "tile";

type LogoMarkProps = {
  variant?: LogoVariant;
  size?: number;
  className?: string;
  decorative?: boolean;
  /** Badge halo fill when variant is `mark` (separates badge from star). */
  haloFill?: string;
};

/** OpenTranslator logomark — star + bottom-right diamond badge. */
export function LogoMark({
  variant = "mark",
  size = 28,
  className,
  decorative = false,
  haloFill = "var(--background, #fff)",
}: LogoMarkProps) {
  const tile = variant === "tile";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "OpenTranslator"}
    >
      {tile ? (
        <rect width="32" height="32" rx="8" fill={LOGO_TILE_FILL} />
      ) : null}
      <path d={LOGO_STAR_PATH} fill="currentColor" />
      <polygon
        points={LOGO_BADGE_HALO}
        fill={tile ? LOGO_TILE_FILL : haloFill}
      />
      <polygon points={LOGO_BADGE} fill="currentColor" />
    </svg>
  );
}
