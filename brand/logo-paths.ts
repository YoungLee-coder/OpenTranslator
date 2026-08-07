/**
 * OpenTranslator logomark — concave star + corner diamond badge.
 */
export const LOGO_TILE_FILL = "#F5F2EF";
export const LOGO_INK = "#21201C";

/** Deep-pinch four-point star. */
export const LOGO_STAR_PATH =
  "M16 5 C18.8 9.5 18.8 13.4 27 16 C18.8 18.6 18.8 22.5 16 27 C13.2 22.5 13.2 18.6 5 16 C13.2 13.4 13.2 9.5 16 5 Z" as const;

/** Bottom-right badge — small diamond (center 25.75, 25.75). */
export const LOGO_BADGE = "25.75 23 28.5 25.75 25.75 28.5 23 25.75" as const;

/** Halo diamond so badge reads on the star edge. */
export const LOGO_BADGE_HALO =
  "25.75 22.25 29.25 25.75 25.75 29.25 22.25 25.75" as const;

/** Canonical SVG markup (tile + mark) for static assets. */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="OpenTranslator">
  <rect width="32" height="32" rx="8" fill="${LOGO_TILE_FILL}"/>
  <path fill="${LOGO_INK}" d="${LOGO_STAR_PATH}"/>
  <polygon fill="${LOGO_TILE_FILL}" points="${LOGO_BADGE_HALO}"/>
  <polygon fill="${LOGO_INK}" points="${LOGO_BADGE}"/>
</svg>` as const;
