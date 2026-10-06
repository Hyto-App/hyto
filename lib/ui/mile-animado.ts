import type { InstanciaRig, ToqueRig } from "./mile-rig";
import type { EstadoMile } from "./mile";

export type { ToqueRig };

/** What Mile is doing on screen. Each one maps to a call of the rig (docs/mile-animada/LEEME.md). */
export const ESTADOS_ANIMADOS = ["reposo", "saludo", "buscando", "lo-tengo", "pagado", "parcial", "rechazado", "error-subida", "vacio"] as const;

export type EstadoAnimado = (typeof ESTADOS_ANIMADOS)[number];

export function aplicarEstado(rig: Pick<InstanciaRig, "mood" | "search" | "reveal">, estado: EstadoAnimado): void {
  switch (estado) {
    case "buscando":
      return rig.search();
    case "lo-tengo":
      return rig.reveal("happy");
    case "pagado":
      return rig.reveal("excited");
    case "rechazado":
      return rig.reveal("sad");
    case "saludo":
      return rig.mood("happy");
    case "parcial":
      return rig.mood("thinking");
    case "error-subida":
      return rig.mood("worried");
    case "vacio":
      return rig.mood("sleepy");
    default:
      return rig.mood("neutral");
  }
}

/** Official static SVG shown while the rig loads or if it fails. */
export const RESPALDO_ESTATICO: Record<EstadoAnimado, EstadoMile> = {
  reposo: "descansando",
  saludo: "cara-feliz",
  buscando: "buscando",
  "lo-tengo": "la-tengo",
  pagado: "la-tengo",
  parcial: "cara-neutra",
  rechazado: "rechazado",
  "error-subida": "rechazado",
  vacio: "icono",
};
