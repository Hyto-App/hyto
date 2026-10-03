// Server-only helpers: the logo as a standalone SVG for ImageResponse (Open Graph, app icons).
import { TRANSFORM_MARCA, TRAZO_ISOTIPO, TRAZO_PALABRA, VIEWBOX_ISOTIPO, VIEWBOX_LOGO } from "./trazos";

/** Standalone SVG of the full logo, for ImageResponse (Open Graph, icons). */
export function svgLogo(colorIsotipo: string, colorPalabra: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_LOGO}"><g transform="${TRANSFORM_MARCA}"><path fill="${colorIsotipo}" d="${TRAZO_ISOTIPO}"/><path fill="${colorPalabra}" d="${TRAZO_PALABRA}"/></g></svg>`;
}

/** Standalone SVG of the isotipo. */
export function svgIsotipo(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_ISOTIPO}"><g transform="${TRANSFORM_MARCA}"><path fill="${color}" d="${TRAZO_ISOTIPO}"/></g></svg>`;
}

export function comoDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
