/**
 * A desktop with a mouse. A phone keeps the camera even when the device list
 * is empty (some mobile browsers hide cameras until permission).
 */
export function escritorioConMouse(coincide: (consulta: string) => boolean): boolean {
  return coincide("(hover: hover) and (pointer: fine)");
}

export function detectarEscritorio(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return escritorioConMouse((consulta) => window.matchMedia(consulta).matches);
  } catch {
    return false;
  }
}

/** No video input. An empty list is "no camera"; a missing list is "unknown". */
export function camaraAusente(dispositivos: readonly { kind: string }[]): boolean {
  return !dispositivos.some((item) => item.kind === "videoinput");
}

/** The browser looked and found no camera. A denied permission is not this. */
export function errorSinCamara(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  const nombre = (error as { name: unknown }).name;
  return nombre === "NotFoundError" || nombre === "DevicesNotFoundError";
}

/** Absolute link to this same task. Nothing else is added to the URL. */
export function enlaceDeEstaTarea(origen: string, tareaId: string): string {
  const base = origen.replace(/\/+$/, "");
  return `${base}/tareas/${encodeURIComponent(tareaId)}`;
}
