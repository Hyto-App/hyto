/**
 * Photo exam for Mile. Runs each case in pruebas-mile/casos.json through revisar(), the same
 * entry an upload uses, and does not write to the database.
 *
 *   npm run examen-mile
 *
 * Reads GROQ_API_KEY, GEMINI_API_KEY, and LAYA_URL from the environment or .env.local.
 * A missing photo is skipped. Keys are never printed or saved.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { TareaFila } from "../lib/db/tipos";
import type { TipoTarea } from "../lib/integrante/tipos";
import { etiquetasDesdeVeredicto } from "../lib/revision/mostrar-razones";
import { revisar } from "../lib/revision/revisar";
import { modeloVision } from "../lib/revision/scout";
import { unirDescripcion } from "../lib/revision/snapshot-razones";
import { cargarEnvLocal } from "./cargar-env-local";

export const CARPETA_EXAMEN = "pruebas-mile";
export const CLAVES_EXAMEN = ["GROQ_API_KEY", "GEMINI_API_KEY", "LAYA_URL"] as const;

const BANDAS = ["Cumplió", "Parcial", "Insuficiente"] as const;
const TIPOS_TAREA = ["trabajo", "reembolso"] as const;
const ARCHIVO = /^fotos\/[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp|heic)$/;

const TIPOS_FOTO: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

const VEREDICTO_A_BANDA = {
  cumplió: "Cumplió",
  parcial: "Parcial",
  insuficiente: "Insuficiente",
} as const;

export type BandaExamen = (typeof BANDAS)[number];

export type CasoExamen = {
  id: string;
  archivo: string;
  tipo: TipoTarea;
  condicion: string;
  esperado: BandaExamen;
  nota_para_tomar_la_foto: string;
};

export type FilaExamen = {
  id: string;
  archivo: string;
  esperado: BandaExamen;
  obtenido: BandaExamen | "error";
  nota: number | null;
  acierto: boolean;
  etiquetas: string[];
  origen: string;
  codigo: string | null;
};

export type InformeExamen = {
  generadoEn: string;
  modeloVision: string;
  omitidos: { id: string; archivo: string }[];
  casos: FilaExamen[];
  aciertos: number;
  revisados: number;
  porcentaje: number | null;
};

export type ContextoExamen = {
  claveGroq: string;
  claveGemini: string;
  layaUrl: string;
  fetchImpl?: typeof fetch;
};

type OpcionesCorrer = {
  casos: readonly CasoExamen[];
  leerFoto: (archivo: string) => Uint8Array | null;
  contexto: ContextoExamen;
  modeloVision?: string;
  ahora?: Date;
  avisar?: (linea: string) => void;
};

export function clavesFaltantes(env: { [clave: string]: string | undefined } = process.env): string[] {
  return CLAVES_EXAMEN.filter((nombre) => !env[nombre]?.trim());
}

export function mensajeClaves(faltan: readonly string[]): string {
  const lista = faltan.map((nombre) => `- ${nombre}`).join("\n");
  return [
    "Faltan claves para el examen de Mile. No se muestra ningún valor.",
    "Ponlas en .env.local y vuelve a correr npm run examen-mile.",
    lista,
  ].join("\n");
}

export function leerCasos(json: unknown): CasoExamen[] {
  if (!Array.isArray(json)) throw new Error("casos.json tiene que ser una lista.");
  const vistos = new Set<string>();
  const archivos = new Set<string>();
  return json.map((fila, indice) => leerCaso(fila, indice, vistos, archivos));
}

export function rutaDeFoto(archivo: string, raiz = resolve(CARPETA_EXAMEN)): string {
  const limpio = archivo.replace(/\\/g, "/");
  if (!ARCHIVO.test(limpio)) throw new Error(`Archivo no permitido: ${archivo}`);
  const ruta = resolve(raiz, limpio);
  const fotos = resolve(raiz, "fotos");
  if (ruta !== fotos && !ruta.startsWith(`${fotos}${sep}`)) throw new Error(`Archivo no permitido: ${archivo}`);
  return ruta;
}

export function tipoDeArchivo(archivo: string): string | null {
  return TIPOS_FOTO[extname(archivo).toLowerCase()] ?? null;
}

export function nombreResultado(fecha: Date): string {
  return `${fecha.toISOString().replace(/[:.]/g, "-")}.json`;
}

/** One case through revisar(). The caller passes the photo bytes. Nothing is stored. */
export async function revisarCaso(caso: CasoExamen, foto: { bytes: Uint8Array; tipo: string }, contexto: ContextoExamen): Promise<FilaExamen> {
  const tarea = tareaDe(caso);
  try {
    const resultado = await revisar(tarea, foto, {
      claveGroq: contexto.claveGroq,
      claveGemini: contexto.claveGemini,
      layaUrl: contexto.layaUrl,
      fetchImpl: contexto.fetchImpl,
      produccion: false,
      mileActivo: false,
    });
    const textoScout = unirDescripcion(resultado.texto, resultado.detalle, resultado.lectura);
    const etiquetas = etiquetasDesdeVeredicto({
      textoScout,
      origen: resultado.origen,
      monto: resultado.monto,
      fecha: resultado.fecha,
      tope: tarea.tope,
      tipo: tarea.tipo,
    }).map((etiqueta) => etiqueta.id);
    const banda = resultado.origen === "scout" ? VEREDICTO_A_BANDA[resultado.veredicto] : null;
    const obtenido = banda ?? "error";
    return {
      id: caso.id,
      archivo: caso.archivo,
      esperado: caso.esperado,
      obtenido,
      nota: banda ? resultado.nota : null,
      acierto: obtenido === caso.esperado,
      etiquetas,
      origen: resultado.origen,
      codigo: resultado.codigo,
    };
  } catch {
    return filaError(caso, "excepcion");
  }
}

export async function correrExamen(opciones: OpcionesCorrer): Promise<InformeExamen> {
  const omitidos: InformeExamen["omitidos"] = [];
  const casos: FilaExamen[] = [];
  for (const caso of opciones.casos) {
    const bytes = opciones.leerFoto(caso.archivo);
    if (!bytes) {
      omitidos.push({ id: caso.id, archivo: caso.archivo });
      opciones.avisar?.(`Salto ${caso.id}: falta ${caso.archivo}`);
      continue;
    }
    const tipo = tipoDeArchivo(caso.archivo);
    if (!tipo) {
      casos.push(filaError(caso, "tipo"));
      opciones.avisar?.(`Salto ${caso.id}: el archivo no es una foto conocida`);
      continue;
    }
    opciones.avisar?.(`Revisando ${caso.id}…`);
    casos.push(await revisarCaso(caso, { bytes, tipo }, opciones.contexto));
  }
  const aciertos = casos.filter((fila) => fila.acierto).length;
  const revisados = casos.length;
  return {
    generadoEn: (opciones.ahora ?? new Date()).toISOString(),
    modeloVision: opciones.modeloVision ?? "no indicado",
    omitidos,
    casos,
    aciertos,
    revisados,
    porcentaje: revisados === 0 ? null : Math.round((aciertos / revisados) * 100),
  };
}

export function textoInforme(informe: InformeExamen): string {
  const encabezado = ["caso", "esperado", "obtenido", "nota", "acierto", "etiquetas"];
  const filas = informe.casos.map((fila) => [
    fila.id,
    fila.esperado,
    fila.obtenido,
    fila.nota === null ? "—" : String(fila.nota),
    fila.acierto ? "sí" : "no",
    textoEtiquetas(fila),
  ]);
  const anchos = encabezado.map((titulo, columna) =>
    Math.max(titulo.length, ...filas.map((fila) => fila[columna]?.length ?? 0)),
  );
  const linea = (celdas: string[]) => celdas.map((celda, columna) => celda.padEnd(anchos[columna] ?? 0)).join("  ");
  const tabla = [linea(encabezado), ...filas.map(linea)].join("\n");
  return `${tabla}\n${textoPorcentaje(informe)}`;
}

export function redactarExamen(texto: string, secretos: readonly (string | null | undefined)[]): string {
  let limpio = texto.replace(/Bearer\s+\S+/gi, "Bearer [redactado]");
  for (const secreto of secretos) {
    if (secreto && secreto.length >= 4) limpio = limpio.split(secreto).join("[redactado]");
  }
  return limpio;
}

function textoEtiquetas(fila: FilaExamen): string {
  if (fila.etiquetas.length > 0) return fila.etiquetas.join(", ");
  if (fila.codigo) return `error:${fila.codigo}`;
  return "—";
}

function textoPorcentaje(informe: InformeExamen): string {
  const sinFoto = informe.omitidos.length ? ` Sin foto: ${informe.omitidos.length}.` : "";
  if (informe.revisados === 0) return `Aciertos: 0 de 0. No había fotos para calificar.${sinFoto}`;
  return `Aciertos: ${informe.aciertos} de ${informe.revisados} (${informe.porcentaje}%).${sinFoto}`;
}

function filaError(caso: CasoExamen, codigo: string): FilaExamen {
  return {
    id: caso.id,
    archivo: caso.archivo,
    esperado: caso.esperado,
    obtenido: "error",
    nota: null,
    acierto: false,
    etiquetas: [],
    origen: "error",
    codigo,
  };
}

function tareaDe(caso: CasoExamen): TareaFila {
  const reembolso = caso.tipo === "reembolso";
  return {
    id: `examen-${caso.id}`,
    proyectoId: "examen-mile",
    titulo: caso.id,
    tipo: caso.tipo,
    monto: reembolso ? "15" : "20",
    tope: reembolso ? "15" : null,
    condicion: caso.condicion,
    miembroId: "",
    walletCobro: "",
    estado: "en revisión",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
    requisitos: null,
  };
}

function leerCaso(fila: unknown, indice: number, vistos: Set<string>, archivos: Set<string>): CasoExamen {
  if (!fila || typeof fila !== "object" || Array.isArray(fila)) fallar(indice, "no es un objeto.");
  const caso = fila as Record<string, unknown>;
  const id = texto(caso.id);
  if (!id) fallar(indice, "falta id.");
  if (vistos.has(id)) throw new Error(`El id "${id}" está repetido en casos.json.`);
  vistos.add(id);
  const archivo = texto(caso.archivo);
  if (!archivo || !ARCHIVO.test(archivo)) fallar(indice, "archivo tiene que ser fotos/nombre.jpg (o png, webp, heic).");
  if (archivos.has(archivo)) throw new Error(`El archivo "${archivo}" está repetido en casos.json.`);
  archivos.add(archivo);
  if (!esTipo(caso.tipo)) fallar(indice, "tipo tiene que ser trabajo o reembolso.");
  const condicion = texto(caso.condicion);
  if (!condicion) fallar(indice, "falta condicion.");
  if (!esBanda(caso.esperado)) fallar(indice, "esperado tiene que ser Cumplió, Parcial o Insuficiente.");
  const nota = texto(caso.nota_para_tomar_la_foto);
  if (!nota) fallar(indice, "falta nota_para_tomar_la_foto.");
  return { id, archivo, tipo: caso.tipo, condicion, esperado: caso.esperado, nota_para_tomar_la_foto: nota };
}

function fallar(indice: number, detalle: string): never {
  throw new Error(`El caso ${indice + 1} de casos.json no sirve: ${detalle}`);
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function esTipo(valor: unknown): valor is TipoTarea {
  return typeof valor === "string" && (TIPOS_TAREA as readonly string[]).includes(valor);
}

function esBanda(valor: unknown): valor is BandaExamen {
  return typeof valor === "string" && (BANDAS as readonly string[]).includes(valor);
}

function leerFotoDeDisco(archivo: string): Uint8Array | null {
  const ruta = rutaDeFoto(archivo);
  if (!existsSync(ruta)) return null;
  return new Uint8Array(readFileSync(ruta));
}

async function main(): Promise<number> {
  const hayLocal = existsSync(".env.local");
  if (!hayLocal) console.error("No está .env.local. El examen lee las claves de ahí.");
  else cargarEnvLocal();
  const faltan = clavesFaltantes();
  if (faltan.length > 0) {
    console.error(mensajeClaves(faltan));
    return 1;
  }
  const claveGroq = process.env.GROQ_API_KEY?.trim() ?? "";
  const claveGemini = process.env.GEMINI_API_KEY?.trim() ?? "";
  const layaUrl = process.env.LAYA_URL?.trim() ?? "";
  let casos: CasoExamen[];
  try {
    casos = leerCasos(JSON.parse(readFileSync(resolve(CARPETA_EXAMEN, "casos.json"), "utf8")) as unknown);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "casos.json no se pudo leer.";
    console.error(mensaje);
    return 1;
  }
  const informe = await correrExamen({
    casos,
    leerFoto: leerFotoDeDisco,
    contexto: { claveGroq, claveGemini, layaUrl },
    modeloVision: modeloVision(),
    avisar: (linea) => console.log(linea),
  });
  console.log(textoInforme(informe));
  const destino = resolve(CARPETA_EXAMEN, "resultados", nombreResultado(new Date(informe.generadoEn)));
  mkdirSync(dirname(destino), { recursive: true });
  const cuerpo = redactarExamen(`${JSON.stringify(informe, null, 2)}\n`, [claveGroq, claveGemini, process.env.LAYA_API_KEY]);
  writeFileSync(destino, cuerpo, "utf8");
  console.log(`Resultados guardados en ${destino}`);
  return 0;
}

function esEntradaDirecta(): boolean {
  const entrada = process.argv[1]?.replace(/\\/g, "/");
  if (!entrada) return false;
  if (!/\/examen-mile\.ts$/.test(entrada)) return false;
  return import.meta.url === pathToFileURL(resolve(entrada)).href;
}

if (esEntradaDirecta()) {
  main()
    .then((codigo) => {
      process.exitCode = codigo;
    })
    .catch((error: unknown) => {
      const mensaje = error instanceof Error ? error.message : "error";
      console.error(redactarExamen(mensaje, [process.env.GROQ_API_KEY, process.env.GEMINI_API_KEY, process.env.LAYA_API_KEY]));
      process.exitCode = 1;
    });
}
