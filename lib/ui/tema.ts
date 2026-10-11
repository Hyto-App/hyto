/** Saved choice in `localStorage`. Anything else follows the system. */
export const TEMA_CLAVE = "hyto-tema";

export type TemaNombre = "dark" | "light";

/** A saved `light` or `dark` wins. With nothing saved, the system preference decides. */
export function temaInicial(guardado: string | null, prefiereClaro: boolean): TemaNombre {
  if (guardado === "light" || guardado === "dark") return guardado;
  return prefiereClaro ? "light" : "dark";
}

/**
 * Runs in `<head>` before paint, including on the sign-in screen (that screen does not mount the toggle).
 * Same rule as `temaInicial`. A later system change applies only when nothing valid is saved.
 */
export const TEMA_BOOT = `(function(){try{var clave="hyto-tema";function aplicar(){var t=window.localStorage.getItem(clave);if(t!=="light"&&t!=="dark"){var media=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)");t=media&&media.matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#0E1024":"#F5F6FA");}aplicar();var media=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)");if(media&&media.addEventListener)media.addEventListener("change",aplicar);}catch(e){}})();`;
