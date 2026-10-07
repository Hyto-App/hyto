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
