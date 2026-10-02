export const MOTIVO_COPIA =
  "This photo matches an earlier submission, so the recommendation stays at insufficient.";

export function notaCopia(motivo: string | null | undefined): string | null {
  const limpio = motivo?.trim() ?? "";
  return limpio || null;
}

export function notaManual(codigo: string | null | undefined): string | null {
  if (codigo === "pdf") return "Needs a manual review";
  return null;
}

export function aplicarCopia<
  T extends { veredicto: "cumplió" | "parcial" | "insuficiente"; frase: string; origen: string; score: string },
>(resultado: T, cerca: boolean): T {
  if (!cerca) return resultado;
  const frase = resultado.frase.includes(MOTIVO_COPIA) ? resultado.frase : `${resultado.frase} ${MOTIVO_COPIA}`.trim();
  if (resultado.origen === "error" || resultado.veredicto === "insuficiente") return { ...resultado, frase };
  return { ...resultado, veredicto: "insuficiente", score: "insuficiente", frase };
}
