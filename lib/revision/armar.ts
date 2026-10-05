import { centavos } from "@/lib/admin/vista";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Veredicto } from "@/lib/admin/tipos";
import { etiquetaChoice } from "@/lib/ui/etiquetas";
import { montoSinUsd, type LecturaEvidencia } from "./lectura";
import { calificar, notaDeTexto, type MotivoTope } from "./pesos";

export type Senales = {
  choice: string;
  noul: boolean;
  score: string;
  /** Caps already named by the answers. Empty when none apply. */
  motivos?: MotivoTope[];
  /** Answer snapshot. Stored beside the description. Never shown as the phrase. */
  detalle?: string | null;
};

export type Descripcion = {
  texto: string;
  /** US dollars. Null when the photo shows no total or its currency could not be converted. */
  monto: string | null;
  fecha: string | null;
  /** The structured reading. Absent when the model sent the older one-sentence reply. */
  lectura?: LecturaEvidencia | null;
};

export type OrigenRevision = "scout" | "guion" | "stub" | "error";

export type ResultadoRevision = Descripcion &
  Senales & {
    veredicto: Veredicto;
    nota: number | null;
    frase: string;
    origen: OrigenRevision;
    codigo: string | null;
    /**
     * Set only when HYTO_MILE_REQUISITOS is on and the task has requisitos.
     * rechazoJson is null when Mile leaves the photo with the organizer.
     */
    mile?: {
      accion: "seguir" | "rechazar";
      rechazoJson: string | null;
      puntaje: number;
      notaMile: string;
      resultados: { id: string; texto: string; estado: "cumple" | "parcial" | "no_cumple"; observacion: string }[];
    };
  };

const NOTA_STUB_TRABAJO = 65;
const NOTA_STUB_REEMBOLSO = 90;

const TEXTO_TRABAJO = "Table set up, ZEEK banner facing forward, three open boxes. The back of the room is not visible.";
const TEXTO_REEMBOLSO = "Team meal receipt, with the amount and date visible.";

export function guionFijo(tipo: TipoTarea): Descripcion & Senales {
  if (tipo === "reembolso") {
    return {
      texto: TEXTO_REEMBOLSO,
      monto: "12.40",
      fecha: "2026-09-27",
      choice: "factura",
      noul: false,
      score: String(NOTA_STUB_REEMBOLSO),
    };
  }
  return {
    texto: TEXTO_TRABAJO,
    monto: null,
    fecha: null,
    choice: "stand",
    noul: false,
    score: String(NOTA_STUB_TRABAJO),
  };
}

export function stubLaya(tipo: TipoTarea): Senales {
  if (tipo === "reembolso") return { choice: "factura", noul: false, score: String(NOTA_STUB_REEMBOLSO) };
  return { choice: "stand", noul: false, score: String(NOTA_STUB_TRABAJO) };
}

type EntradaReembolso = {
  tipo: TipoTarea;
  tope: string | null;
  monto: string | null;
  fecha: string | null;
  /** A total was printed, but its currency is unknown or has no rate, so there is no dollar amount. */
  montoSinUsd?: boolean;
};

// The percentage is the result. It never approves a payment.
export function armarVeredicto(
  entrada: EntradaReembolso & {
    score: string;
    motivos?: readonly MotivoTope[];
  },
): { nota: number; veredicto: Veredicto } | null {
  const nota = notaDeTexto(entrada.score);
  if (nota === null) return null;
  const motivos = [...(entrada.motivos ?? []), ...motivosReembolso(entrada)];
  const calificado = calificar(nota, motivos);
  return { nota: calificado.nota, veredicto: calificado.veredicto };
}

export function limitarNotaReembolso(nota: number, entrada: EntradaReembolso): number {
  return calificar(nota, motivosReembolso(entrada)).nota;
}

/** The saved amount and date name these caps. The confirmed amount, not this grade, bounds the payment. */
export function motivosReembolso(entrada: EntradaReembolso): MotivoTope[] {
  if (entrada.tipo !== "reembolso") return [];
  const motivos: MotivoTope[] = [];
  const monto = centavos(entrada.monto);
  const tope = centavos(entrada.tope);
  if (!entrada.monto || monto <= 0) motivos.push(entrada.montoSinUsd ? "moneda_sin_usd" : "sin_monto");
  if (!entrada.fecha) motivos.push("sin_fecha");
  if (tope > 0 && monto > tope) motivos.push("sobre_tope");
  return motivos;
}

export function fraseDe(texto: string, senales: Senales): string {
  const nota = notaDeTexto(senales.score);
  const grado = nota === null ? senales.score : `${nota}%`;
  return `${texto.trim()} Category ${etiquetaChoice(senales.choice)}, grade ${grado}.`;
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
  const armado = armarVeredicto({
    tipo,
    tope,
    monto,
    fecha,
    montoSinUsd: montoSinUsd(descripcion.lectura),
    score: senales.score,
    motivos: senales.motivos,
  });
  if (!armado) return null;
  const senalesFinales: Senales = {
    ...senales,
    score: String(armado.nota),
    // noul stays true only when every question earned its full weight.
    noul: armado.nota === 100 ? senales.noul : false,
  };
  return {
    texto: descripcion.texto.trim(),
    monto,
    fecha,
    ...(descripcion.lectura ? { lectura: descripcion.lectura } : {}),
    ...senalesFinales,
    veredicto: armado.veredicto,
    nota: armado.nota,
    frase: fraseDe(descripcion.texto, senalesFinales),
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
    nota: null,
    frase: fallo.mensaje,
    origen: "error",
    codigo: fallo.code,
  };
}

export function desdeGuion(tipo: TipoTarea, tope: string | null): ResultadoRevision {
  const guion = guionFijo(tipo);
  const cerrado = cerrar(tipo, tope, guion, guion, "guion");
  if (!cerrado) throw new Error("The sample script did not produce a grade.");
  return cerrado;
}
