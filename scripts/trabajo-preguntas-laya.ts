/**
 * Manual probe for the new work questions. Not part of `npm test`.
 *
 *   npx tsx scripts/trabajo-preguntas-laya.ts [ruta.json]
 *
 * Reads LAYA_URL and LAYA_API_KEY from the environment (and from .env.local
 * when that file exists). Never prints the key. Writes Laya's answers as JSON.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cargarEnvLocal } from "./cargar-env-local";
import { urlLaya } from "../lib/revision/laya";
import { cuerpoTrabajo } from "../lib/revision/trabajo-preguntas";

const PEDIDO = "Paint 3 benches at the central park on 2 October 2026.";

const CASOS = [
  {
    id: "completo",
    descripcion:
      "Three benches at the central park are fully painted green. The work is finished. A sign in the photo reads 2 October 2026. The photo shows the benches, not a receipt.",
  },
  {
    id: "parcial",
    descripcion:
      "One of three benches at the central park has green paint. The other two benches are still bare wood. The work is partly done.",
  },
  {
    id: "otro_lugar",
    descripcion:
      "Three benches are fully painted green in the school courtyard. The photo is not at the central park. The work looks finished.",
  },
  {
    id: "vago",
    descripcion: "A photo of something outdoors.",
  },
] as const;

const SALIDA_DEFECTO = resolve("scripts/salida/trabajo-preguntas-laya.json");

function redactar(texto: string, clave: string): string {
  let limpio = texto.replace(/Bearer\s+\S+/gi, "Bearer [redactado]");
  if (clave) limpio = limpio.split(clave).join("[redactado]");
  return limpio;
}

function elecciones(json: unknown): Record<string, string> {
  if (!json || typeof json !== "object") return {};
  const raiz = json as Record<string, unknown>;
  const fuente = raiz.answers && typeof raiz.answers === "object" && !Array.isArray(raiz.answers) ? raiz.answers : raiz;
  const salida: Record<string, string> = {};
  for (const [id, nodo] of Object.entries(fuente as Record<string, unknown>)) {
    if (!nodo || typeof nodo !== "object" || Array.isArray(nodo)) continue;
    const choice = (nodo as Record<string, unknown>).choice;
    if (typeof choice === "string") salida[id] = choice;
  }
  return salida;
}

async function main(): Promise<number> {
  cargarEnvLocal();
  const clave = process.env.LAYA_API_KEY?.trim() ?? "";
  const base = process.env.LAYA_URL?.trim() ?? "";
  if (!base) {
    console.error("Falta LAYA_URL. No se imprime ninguna llave.");
    return 1;
  }
  if (!clave) {
    console.error("Falta LAYA_API_KEY. No se imprime ninguna llave.");
    return 1;
  }

  const destino = resolve(process.argv[2]?.trim() || SALIDA_DEFECTO);
  const casos: Array<Record<string, unknown>> = [];
  for (const caso of CASOS) {
    let respuesta: Response;
    try {
      respuesta = await fetch(urlLaya(base), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${clave}`,
        },
        body: JSON.stringify(cuerpoTrabajo(caso.descripcion, PEDIDO)),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "error";
      casos.push({ id: caso.id, descripcion: caso.descripcion, ok: false, error: redactar(mensaje, clave) });
      continue;
    }
    const crudo = await respuesta.text();
    let json: unknown = null;
    try {
      json = JSON.parse(crudo);
    } catch {
      json = null;
    }
    casos.push({
      id: caso.id,
      descripcion: caso.descripcion,
      ok: respuesta.ok,
      status: respuesta.status,
      elecciones: elecciones(json),
      respuesta: json ?? redactar(crudo, clave),
    });
    console.log(`${caso.id}: HTTP ${respuesta.status}`);
  }

  mkdirSync(dirname(destino), { recursive: true });
  const documento = { pedido: PEDIDO, casos };
  writeFileSync(destino, `${JSON.stringify(documento, null, 2)}\n`, "utf8");
  console.log(`Respuestas guardadas en ${destino}`);
  return casos.every((caso) => caso.ok === true) ? 0 : 1;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((error: unknown) => {
    const mensaje = error instanceof Error ? error.message : "error";
    console.error(mensaje.replace(/Bearer\s+\S+/gi, "Bearer [redactado]"));
    process.exitCode = 1;
  });
