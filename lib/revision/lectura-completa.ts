import { mileFaltantesGroqActivo, type EntornoFaltantesGroq } from "./faltantes-groq";
import type { RespuestasTrabajo } from "./laya";
import type { LecturaEvidencia } from "./lectura";
import { PESOS_PREGUNTAS } from "./pesos";

type LecturaParaCompleta = Pick<LecturaEvidencia, "tipo" | "legible" | "faltantes" | "coincide">;

/**
 * The vision model saw the photo next to the request and found nothing missing: a legible photo of the
 * work (or of an invoice), an empty faltantes list, and no coincide of "no" or "parcial".
 * Laya only reads the written description, so a hedge from Laya ("can't tell", "partly", "some of it")
 * is not evidence that something is missing when the reading itself says nothing is.
 */
export function lecturaCompleta(lectura: LecturaParaCompleta | null | undefined, tipos: ReadonlyArray<string> = ["trabajo"]): boolean {
  if (!lectura) return false;
  if (!lectura.tipo || !tipos.includes(lectura.tipo)) return false;
  if (lectura.legible !== true) return false;
  if (!Array.isArray(lectura.faltantes) || lectura.faltantes.some((item) => item.trim().length > 0)) return false;
  if (lectura.coincide === "no" || lectura.coincide === "parcial") return false;
  return true;
}

/**
 * Points to add to notaDeTrabajo when HYTO_MILE_FALTANTES_GROQ is on and lecturaCompleta holds.
 * This is what kept a complete, good photo at 67% «Falta parte de lo pedido»: Laya hedged on
 * v1 (no_se_puede_saber), v2 and t10 (middle step) and lugar (no_claro) only because the text did
 * not spell them out. Those hedges get full credit. Nothing is lifted when Laya says v1 es_otra_cosa,
 * t6 a_medias or sin_empezar, or t9 yes. v2 or t10 at 0, the place the organizer asked for, and every cap stay.
 */
export function puntosLecturaCompleta(
  trabajo: RespuestasTrabajo | null | undefined,
  lectura: LecturaParaCompleta | null | undefined,
  env: EntornoFaltantesGroq = process.env,
): number {
  if (!mileFaltantesGroqActivo(env)) return 0;
  if (!trabajo || !lecturaCompleta(lectura)) return 0;
  if (trabajo.v1 === "es_otra_cosa" || trabajo.v4) return 0;
  // Laya saying the work is half done, not started, or unfinished is a real signal, not a hedge.
  if (trabajo.t6 === "a_medias" || trabajo.t6 === "sin_empezar" || trabajo.t9) return 0;
  const peso = PESOS_PREGUNTAS.trabajo;
  let extra = 0;
  if (trabajo.v1 === "no_se_puede_saber") extra += peso.v1 / 2;
  if (trabajo.v2 === 1) extra += peso.v2 / 2;
  if (trabajo.t10 === 1) extra += peso.t10 / 2;
  if (trabajo.lugar === "no_claro") extra += peso.lugar;
  return extra;
}

/**
 * Requirement levels after the same check. A "partly there" from the text becomes "there". A "missing"
 * from the text becomes "partly there": the photo is not sent back while the reading says nothing is
 * missing, and the organizer decides.
 */
export function nivelesConLectura(
  niveles: ReadonlyArray<0 | 1 | 2>,
  lectura: LecturaParaCompleta | null | undefined,
): Array<0 | 1 | 2> {
  if (!lecturaCompleta(lectura, ["trabajo", "recibo"])) return [...niveles];
  return niveles.map((nivel) => (nivel === 0 ? 1 : 2));
}
