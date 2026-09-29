import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analizarDiff, armarInventario, type Inventario } from "./inventario";

const CONFIRMAR = "confirmar con Esteban";
const SHA_PEDIDO = "ce9ff7c";
const PRS = [15, 16];

export type BaseInventario = {
  rama: "main";
  sha: string;
  shaCortoPedido: typeof SHA_PEDIDO;
  coincideConElShaPedido: boolean;
  asunto: string;
  archivosDeEsquemaIgualesAEseCommit: boolean;
  archivosComparados: { ruta: string; igual: boolean }[];
};

export type RevisionPr = {
  numero: number;
  titulo: string | null;
  borrador: boolean | null;
  estado: string | null;
  rama: string | null;
  base: string | null;
  head: string | null;
  archivos: string[];
  cambiaEsquema: boolean | null;
  hallazgos: string[];
  nota: string | null;
};

export type InventarioEscrito = Inventario & {
  base: BaseInventario;
  prs: RevisionPr[];
};

const ARCHIVOS_DE_MAIN = ["drizzle/0000_inicio.sql", "lib/db/schema.ts", "drizzle.config.ts", "scripts/migrar.ts"];

function git(raiz: string, args: string[]): string {
  return execFileSync("git", args, { cwd: raiz, encoding: "utf8" }).trim();
}

export function leerBase(raiz: string): BaseInventario {
  const sha = git(raiz, ["rev-parse", "origin/main"]);
  const asunto = git(raiz, ["log", "-1", "--format=%s", "origin/main"]);
  const archivosComparados = ARCHIVOS_DE_MAIN.map((ruta) => {
    const enCommit = git(raiz, ["rev-parse", `origin/main:${ruta}`]);
    const enDisco = git(raiz, ["hash-object", ruta]);
    return { ruta, igual: enCommit === enDisco };
  });
  return {
    rama: "main",
    sha,
    shaCortoPedido: SHA_PEDIDO,
    coincideConElShaPedido: sha.startsWith(SHA_PEDIDO),
    asunto,
    archivosDeEsquemaIgualesAEseCommit: archivosComparados.every((archivo) => archivo.igual),
    archivosComparados,
  };
}

function mensajeSeguro(error: unknown): string {
  const texto = error instanceof Error ? error.message : "falló gh";
  return texto.replace(/ghp_[A-Za-z0-9]+/g, "[token]").replace(/github_pat_[A-Za-z0-9_]+/g, "[token]").slice(0, 400);
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" ? valor : null;
}

function booleano(valor: unknown): boolean | null {
  return typeof valor === "boolean" ? valor : null;
}

export function leerPr(numero: number, raiz: string): RevisionPr {
  try {
    const metaTexto = execFileSync(
      "gh",
      ["pr", "view", String(numero), "--json", "title,isDraft,state,headRefName,baseRefName,headRefOid,files"],
      { cwd: raiz, encoding: "utf8", maxBuffer: 20_000_000 },
    );
    const meta = JSON.parse(metaTexto) as {
      title?: unknown;
      isDraft?: unknown;
      state?: unknown;
      headRefName?: unknown;
      baseRefName?: unknown;
      headRefOid?: unknown;
      files?: unknown;
    };
    const diff = execFileSync("gh", ["pr", "diff", String(numero)], {
      cwd: raiz,
      encoding: "utf8",
      maxBuffer: 20_000_000,
    });
    const analisis = analizarDiff(diff);
    const archivos = Array.isArray(meta.files)
      ? meta.files
          .map((archivo) => (archivo && typeof archivo === "object" && "path" in archivo ? archivo.path : null))
          .filter((ruta): ruta is string => typeof ruta === "string")
          .sort()
      : [];
    return {
      numero,
      titulo: texto(meta.title),
      borrador: booleano(meta.isDraft),
      estado: texto(meta.state),
      rama: texto(meta.headRefName),
      base: texto(meta.baseRefName),
      head: texto(meta.headRefOid),
      archivos,
      cambiaEsquema: analisis.tocaEsquema,
      hallazgos: analisis.hallazgos,
      nota: analisis.tocaEsquema ? null : "El diff no toca migraciones, lib/db/schema.ts, drizzle.config.ts ni scripts/migrar.ts, y no agrega DDL.",
    };
  } catch (error) {
    return {
      numero,
      titulo: null,
      borrador: null,
      estado: null,
      rama: null,
      base: null,
      head: null,
      archivos: [],
      cambiaEsquema: null,
      hallazgos: [],
      nota: `No se pudo leer el PR #${numero}. ${mensajeSeguro(error)}. ${CONFIRMAR}`,
    };
  }
}

export function inventarioEscrito(raiz: string): InventarioEscrito {
  return {
    ...armarInventario(raiz),
    base: leerBase(raiz),
    prs: PRS.map((numero) => leerPr(numero, raiz)),
  };
}

function raizDelRepo(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

const ejecutadoComoCli = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ejecutadoComoCli) {
  const raiz = raizDelRepo();
  const inventario = inventarioEscrito(raiz);
  const destino = path.join(raiz, "scripts/backend-traspaso/esquema-inventario.json");
  writeFileSync(destino, `${JSON.stringify(inventario, null, 2)}\n`);
  console.log(destino);
}
