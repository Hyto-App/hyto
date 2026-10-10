/** Fixed help. Answers are dictionary keys, never a live model. */

export const ATAJOS = [
  { id: "tareas", href: "/mis-tareas" },
  { id: "evidencia", href: "/mis-tareas" },
  { id: "pago", faq: "pago" },
  { id: "faq" },
] as const;

export type IdAtajo = (typeof ATAJOS)[number]["id"];

export const PREGUNTAS = [
  "pago",
  "tarda",
  "fondear",
  "costos",
  "sinPagar",
  "orgReembolso",
  "evidencia",
  "mile",
  "unirse",
  "ver",
  "otra",
  "reembolso",
  "cobrar",
  "sesion",
  "datos",
] as const;

export type IdPregunta = (typeof PREGUNTAS)[number];

export type PreguntaVisible = { id: IdPregunta; pregunta: string; respuesta: string };

/** Chips Mile offers before the first question. Frequently asked questions shows them all. */
export const INICIO: readonly IdPregunta[] = ["pago", "tarda", "evidencia", "otra", "fondear", "costos"];

/** Two or three follow-up questions after each answer. */
export const SIGUIENTES: Record<IdPregunta, readonly IdPregunta[]> = {
  pago: ["tarda", "otra", "costos"],
  tarda: ["pago", "otra"],
  fondear: ["costos", "sinPagar"],
  costos: ["fondear", "pago"],
  sinPagar: ["fondear", "costos"],
  orgReembolso: ["reembolso", "costos"],
  evidencia: ["mile", "otra"],
  mile: ["otra", "tarda"],
  unirse: ["ver", "evidencia"],
  ver: ["datos", "unirse"],
  otra: ["evidencia", "mile"],
  reembolso: ["orgReembolso", "evidencia"],
  cobrar: ["pago", "tarda"],
  sesion: ["datos", "ver"],
  datos: ["ver", "sesion"],
};

/** "Mile is typing" before each bubble, and the bubble's fade-in. */
export const ESCRIBIENDO_MS = 600;
export const ENTRADA_MS = 200;

/** One idea per bubble: the dictionary answer has one line per part. */
export function partesRespuesta(respuesta: string): string[] {
  return respuesta
    .split("\n")
    .map((parte) => parte.trim())
    .filter(Boolean);
}

/** When each bubble appears, in ms after the question. Reduced motion shows them all at once. */
export function tiemposPartes(cantidad: number, reducido: boolean): number[] {
  return Array.from({ length: cantidad }, (_, indice) => (reducido ? 0 : (indice + 1) * ESCRIBIENDO_MS + indice * ENTRADA_MS));
}

export function normalizarBusqueda(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Empty search returns every answer. Otherwise the question or the answer has to contain the words. */
export function buscarPreguntas(preguntas: readonly PreguntaVisible[], consulta: string): PreguntaVisible[] {
  const buscada = normalizarBusqueda(consulta);
  if (!buscada) return [...preguntas];
  return preguntas.filter((item) => {
    const texto = normalizarBusqueda(`${item.pregunta} ${item.respuesta}`);
    return buscada.split(/\s+/).every((parte) => texto.includes(parte));
  });
}
