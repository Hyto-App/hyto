import { centavos } from "@/lib/admin/vista";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Veredicto } from "@/lib/admin/tipos";

export type Senales = {
  choice: string;
  noul: boolean;
  score: string;
};

export type Descripcion = {
  texto: string;
  monto: string | null;
  fecha: string | null;
};

export type OrigenRevision = "scout" | "guion" | "stub" | "error";

export type ResultadoRevision = Descripcion &
  Senales & {
    veredicto: Veredicto;
    frase: string;
    origen: OrigenRevision;
    codigo: string | null;
  };

const TEXTO_TRABAJO = "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón.";
const TEXTO_REEMBOLSO = "Comprobante de la comida del equipo, con monto y fecha visibles.";

export function guionFijo(tipo: TipoTarea): Descripcion & Senales {
  if (tipo === "reembolso") {
    return {
      texto: TEXTO_REEMBOLSO,
      monto: "12.40",
      fecha: "2026-09-27",
      choice: "factura",
      noul: true,
      score: "cumplió",
    };
  }
  return {
    texto: TEXTO_TRABAJO,
    monto: null,
    fecha: null,
    choice: "stand",
    noul: true,
    score: "parcial",
  };
}

export function stubLaya(tipo: TipoTarea): Senales {
  if (tipo === "reembolso") return { choice: "factura", noul: true, score: "cumplió" };
  return { choice: "stand", noul: true, score: "parcial" };
}

export function nivelScore(score: string): Veredicto | null {
  const limpio = score.trim().toLowerCase();
  if (limpio === "cumplió" || limpio === "cumplio" || limpio === "completa" || limpio === "completo") return "cumplió";
  if (limpio === "parcial" || limpio === "partial") return "parcial";
  if (limpio === "insuficiente" || limpio === "insufficient") return "insuficiente";
  return null;
}

export function armarVeredicto(entrada: {
  tipo: TipoTarea;
  tope: string | null;
  monto: string | null;
  fecha: string | null;
  noul: boolean;
  score: string;
}): Veredicto | null {
  const nivel = nivelScore(entrada.score);
  if (!nivel) return null;
  if (entrada.tipo === "reembolso") {
    const monto = centavos(entrada.monto);
    const tope = centavos(entrada.tope);
    if (!entrada.monto || !entrada.fecha || monto <= 0) return "insuficiente";
    if (tope > 0 && monto > tope) return "insuficiente";
  }
  if (!entrada.noul) return nivel === "insuficiente" ? "insuficiente" : "parcial";
  if (nivel === "cumplió") return "cumplió";
  return "parcial";
}

export function fraseDe(texto: string, senales: Senales): string {
  const condicion = senales.noul ? "cumplida" : "no cumplida";
  return `${texto.trim()} Categoría ${senales.choice.trim()}, condición ${condicion}, evidencia ${senales.score.trim()}.`;
}

export function cerrar(
  tipo: TipoTarea,
  tope: string | null,
  descripcion: Descripcion,
  senales: Senales,
  origen: Exclude<OrigenRevision, "error">,
): ResultadoRevision | null {
  const monto = tipo === "reembolso" ? descripcion.monto : null;
  const fecha = tipo === "reembolso" ? descripcion.fecha : null;
  const veredicto = armarVeredicto({ tipo, tope, monto, fecha, noul: senales.noul, score: senales.score });
  if (!veredicto) return null;
  return {
    texto: descripcion.texto.trim(),
    monto,
    fecha,
    ...senales,
    veredicto,
    frase: fraseDe(descripcion.texto, senales),
    origen,
    codigo: null,
  };
}

export function desdeFallo(fallo: { code: string; mensaje: string }): ResultadoRevision {
  return {
    texto: fallo.mensaje,
    monto: null,
    fecha: null,
    choice: fallo.code,
    noul: false,
    score: "error",
    veredicto: "insuficiente",
    frase: fallo.mensaje,
    origen: "error",
    codigo: fallo.code,
  };
}

export function desdeGuion(tipo: TipoTarea, tope: string | null): ResultadoRevision {
  const guion = guionFijo(tipo);
  const cerrado = cerrar(tipo, tope, guion, guion, "guion");
  if (!cerrado) {
    return {
      ...guion,
      veredicto: "parcial",
      frase: fraseDe(guion.texto, guion),
      origen: "guion",
      codigo: null,
    };
  }
  return cerrado;
}
