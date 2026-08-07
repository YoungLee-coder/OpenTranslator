import {
  LOGO_BADGE,
  LOGO_BADGE_HALO,
  LOGO_STAR_PATH,
  LOGO_TILE_FILL,
} from "./logo-paths";

type LogoMarkProps = {
  size?: number;
  className?: string;
  tile?: boolean;
  decorative?: boolean;
  /** Badge halo fill when tile is off (e.g. app chrome background). */
  haloFill?: string;
};

/** OpenTranslator logomark — star + bottom-right diamond badge. */
export function LogoMark({
  size = 28,
  className,
  tile = true,
  decorative = false,
  haloFill = "var(--background, #fff)",
}: LogoMarkProps) {
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
