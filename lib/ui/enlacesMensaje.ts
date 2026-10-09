export type TrozoMensaje =
  | { tipo: "texto"; valor: string }
  | { tipo: "configuracion" }
  | { tipo: "ayuda" };

const MARCA = /\[\[(configuracion|ayuda)\]\]/g;

/** Splits a translated notice so Settings and Help can be real links. */
export function trozosDeMensaje(mensaje: string): TrozoMensaje[] {
  const trozos: TrozoMensaje[] = [];
  let cursor = 0;
  for (const marca of mensaje.matchAll(MARCA)) {
    const inicio = marca.index ?? 0;
    if (inicio > cursor) trozos.push({ tipo: "texto", valor: mensaje.slice(cursor, inicio) });
    trozos.push({ tipo: marca[1] === "ayuda" ? "ayuda" : "configuracion" });
    cursor = inicio + marca[0].length;
  }
  if (cursor < mensaje.length) trozos.push({ tipo: "texto", valor: mensaje.slice(cursor) });
  if (trozos.length === 0) trozos.push({ tipo: "texto", valor: mensaje });
  return trozos;
}
