/**
 * Evidence review bank. Runs every labeled case in lib/revision/banco.ts through revisar(), the entry
 * point an upload uses, and saves the description, what Laya received and answered, the grade, and the
 * reasons the review card shows. `npm test` already covers the simulated run (banco.test.ts).
 *
 *   npm run banco:revision                          simulated Qwen and Laya replies. No network, no keys.
 *   npm run banco:revision -- --vivo                real photos from evidencias-prueba/ through Groq and Laya.
 *   npm run banco:revision -- --comparar <archivo>  also prints what changed against an earlier results file.
 *   npm run banco:revision -- --caso <id>           one case only.
 *   npm run banco:revision -- --salida <archivo>    where to write the results.
 *
 * A live run reads GROQ_API_KEY, GROQ_VISION_MODEL, LAYA_URL, and LAYA_API_KEY from the environment or
 * .env.local. Without LAYA_URL the stub grades the description and every case says origen "stub".
 * A case whose photo is not in evidencias-prueba/ is skipped. Keys are never printed or saved.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { cargarEnvLocal } from "./cargar-env-local";
import { claveDeGroq, claveDeLaya, urlDeLaya } from "../lib/config/entorno";
import {
  CARPETA_FOTOS,
  CASOS_BANCO,
  compararResultados,
  correrCaso,
  leerResultados,
  type ResultadoCaso,
  type ResumenCaso,
} from "../lib/revision/banco";
import { CRC_POR_USD } from "../lib/revision/divisas";
import { modeloVision } from "../lib/revision/scout";
import { etiquetaVeredicto, textoNota } from "../lib/ui/etiquetas";

const TIPOS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

type Argumentos = { vivo: boolean; comparar: string | null; caso: string | null; salida: string | null };

function leerArgumentos(argv: readonly string[]): Argumentos {
  const args: Argumentos = { vivo: false, comparar: null, caso: null, salida: null };
  for (let indice = 0; indice < argv.length; indice += 1) {
    const actual = argv[indice];
    if (actual === "--vivo") args.vivo = true;
    else if (actual === "--comparar") args.comparar = argv[++indice] ?? null;
    else if (actual === "--caso") args.caso = argv[++indice] ?? null;
    else if (actual === "--salida") args.salida = argv[++indice] ?? null;
    else throw new Error(`Opción desconocida: ${actual}`);
  }
  return args;
}

function redactar(texto: string, secretos: readonly (string | null)[]): string {
  let limpio = texto.replace(/Bearer\s+\S+/gi, "Bearer [redactado]");
  for (const secreto of secretos) {
    if (secreto) limpio = limpio.split(secreto).join("[redactado]");
  }
  return limpio;
}

function nota(resumen: Pick<ResumenCaso, "nota" | "veredicto">): string {
  return textoNota(etiquetaVeredicto(resumen.veredicto), resumen.nota);
}

function linea(resultado: ResultadoCaso): string {
  const estado = !resultado.cumple ? "FALLA" : resultado.motivoCoincide ? "OK   " : "OK*  ";
  const obtenido = resultado.origen === "error" ? `error (${resultado.codigo ?? "?"})` : nota(resultado);
  const motivo = resultado.razones[0]?.texto ?? "sin razón";
  const esperado = `${etiquetaVeredicto(resultado.esperado.veredicto)} / ${resultado.esperado.motivo}`;
  const antes = resultado.antes ? ` | antes: ${nota(resultado.antes)}` : "";
  return `${estado} ${resultado.id}: ${obtenido} — ${motivo} (esperado: ${esperado})${antes}`;
}

function resumen(caso: ResumenCaso | null): string {
  return caso ? `${nota(caso)} [${caso.motivo ?? "—"}]` : "—";
}

async function main(): Promise<number> {
  const args = leerArgumentos(process.argv.slice(2));
  const casos = args.caso ? CASOS_BANCO.filter((caso) => caso.id === args.caso) : CASOS_BANCO;
  if (casos.length === 0) {
    console.error(`No hay un caso ${args.caso}. Casos: ${CASOS_BANCO.map((caso) => caso.id).join(", ")}.`);
    return 1;
  }

  let vivo: { claveGroq: string; layaUrl: string | null } | null = null;
  if (args.vivo) {
    cargarEnvLocal();
    const claveGroq = claveDeGroq();
    if (!claveGroq) {
      console.error("Falta GROQ_API_KEY. No se imprime ninguna llave.");
      return 1;
    }
    vivo = { claveGroq, layaUrl: urlDeLaya() };
    if (!vivo.layaUrl) console.error("Falta LAYA_URL: el stub califica la descripción y cada caso queda con origen stub.");
    console.log(`Modelo de visión: ${modeloVision()}`);
  }

  const resultados: ResultadoCaso[] = [];
  const omitidos: string[] = [];
  for (const caso of casos) {
    let resultado: ResultadoCaso;
    if (vivo) {
      const ruta = resolve(CARPETA_FOTOS, caso.foto);
      if (!existsSync(ruta)) {
        omitidos.push(`${CARPETA_FOTOS}/${caso.foto}`);
        console.log(`SALTA ${caso.id}: falta ${CARPETA_FOTOS}/${caso.foto}`);
        continue;
      }
      resultado = await correrCaso(caso, {
        modo: "vivo",
        foto: { bytes: new Uint8Array(readFileSync(ruta)), tipo: TIPOS[extname(ruta).toLowerCase()] ?? "image/jpeg" },
        claveGroq: vivo.claveGroq,
        layaUrl: vivo.layaUrl,
      });
    } else {
      resultado = await correrCaso(caso, { modo: "simulado" });
    }
    resultados.push(resultado);
    console.log(linea(resultado));
  }

  const marca = new Date().toISOString();
  const documento = {
    modo: vivo ? "vivo" : "simulado",
    modeloVision: vivo ? modeloVision() : "simulado",
    laya: vivo ? (vivo.layaUrl ? "configurada" : "stub") : "simulada",
    crcPorUsd: CRC_POR_USD,
    generadoEn: marca,
    omitidos,
    casos: resultados,
  };
  const destino = resolve(
    args.salida ?? `${CARPETA_FOTOS}/resultados/${vivo ? `vivo-${marca.replace(/[:.]/g, "-")}` : "simulado"}.json`,
  );
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, redactar(`${JSON.stringify(documento, null, 2)}\n`, [vivo?.claveGroq ?? null, claveDeLaya()]), "utf8");
  console.log(`Resultados guardados en ${destino}`);

  if (args.comparar) {
    const corridos = new Set(resultados.map((resultado) => resultado.id));
    const enBanco = new Set(CASOS_BANCO.map((caso) => caso.id));
    // A case skipped this run (no photo, or not picked with --caso) is not a change. A case gone from the bank is.
    const previo = leerResultados(JSON.parse(readFileSync(resolve(args.comparar), "utf8")) as unknown).filter(
      (caso) => corridos.has(caso.id) || !enBanco.has(caso.id),
    );
    const cambios = compararResultados(previo, resultados).filter((cambio) => cambio.cambio);
    if (cambios.length === 0) console.log(`Sin cambios contra ${args.comparar}.`);
    for (const cambio of cambios) console.log(`CAMBIO ${cambio.id}: ${resumen(cambio.antes)} → ${resumen(cambio.ahora)}`);
  }

  const fallas = resultados.filter((resultado) => !resultado.cumple).length;
  console.log(`${resultados.length - fallas} de ${resultados.length} casos dan la banda esperada.${omitidos.length ? ` ${omitidos.length} sin foto.` : ""}`);
  return fallas === 0 ? 0 : 1;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((error: unknown) => {
    const mensaje = error instanceof Error ? error.message : "error";
    console.error(redactar(mensaje, [process.env.GROQ_API_KEY ?? null, process.env.LAYA_API_KEY ?? null]));
    process.exitCode = 1;
  });
