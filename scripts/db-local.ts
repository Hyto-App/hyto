import { spawn } from "node:child_process";
import { Client } from "pg";
import { aplicarMigraciones } from "../lib/db/aplicar";
import { esHostLocal } from "../lib/db/host";
import { cerrarPools, crearAlmacenNeon } from "../lib/db/neon";
import { asegurarSemilla } from "../lib/db/semilla";

const URL_LOCAL = "postgres://hyto:hyto@127.0.0.1:5432/hyto";

type Estado = "lista" | "sin-base" | "auth" | "abajo";

function urlDeTrabajo(): string {
  return process.env.DATABASE_URL?.trim() || URL_LOCAL;
}

function codigoDe(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code);
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo hablar con Postgres.";
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function correr(comando: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const hijo = spawn(comando, args, { stdio: "inherit" });
    hijo.on("error", () => resolve(127));
    hijo.on("exit", (codigo) => resolve(codigo ?? 1));
  });
}

async function probar(url: string): Promise<{ estado: Estado; detalle: string }> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return { estado: "lista", detalle: "" };
  } catch (error) {
    const codigo = codigoDe(error);
    const detalle = mensajeDe(error);
    if (codigo === "3D000") return { estado: "sin-base", detalle };
    if (codigo === "28P01" || codigo === "28000") return { estado: "auth", detalle };
    return { estado: "abajo", detalle };
  }
}

async function levantarSiHaceFalta(url: string): Promise<{ estado: Estado; detalle: string }> {
  let prueba = await probar(url);
  if (prueba.estado !== "abajo") return prueba;
  if ((await correr("docker", ["compose", "version"])) !== 0) return prueba;
  console.log("No hay Postgres en el puerto local. Levanto docker compose.");
  if ((await correr("docker", ["compose", "up", "-d", "--wait"])) !== 0) {
    await correr("docker", ["compose", "up", "-d"]);
  }
  for (let intento = 0; intento < 30; intento += 1) {
    prueba = await probar(url);
    if (prueba.estado !== "abajo") return prueba;
    await esperar(1000);
  }
  return prueba;
}

function cita(ident: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ident)) throw new Error("El nombre de la base no es válido.");
  return `"${ident}"`;
}

async function asegurarBase(url: string): Promise<void> {
  const parsed = new URL(url);
  const nombre = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  parsed.pathname = "/postgres";
  const client = new Client({ connectionString: parsed.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const existe = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [nombre]);
    if ((existe.rowCount ?? 0) === 0) await client.query(`CREATE DATABASE ${cita(nombre)}`);
  } finally {
    await client.end();
  }
}

async function main(): Promise<number> {
  const url = urlDeTrabajo();
  if (!esHostLocal(url)) {
    console.error("db:local solo usa Postgres en esta máquina (127.0.0.1, localhost o ::1).");
    return 1;
  }
  try {
    const prueba = await levantarSiHaceFalta(url);
    if (prueba.estado === "auth") {
      console.error(prueba.detalle || "Postgres rechazó el usuario de la URL local.");
      return 1;
    }
    if (prueba.estado === "abajo") {
      console.error("No hay Postgres en 127.0.0.1:5432. Instalá Postgres o corré docker compose up -d en la raíz del repo.");
      return 1;
    }
    if (prueba.estado === "sin-base") await asegurarBase(url);
    await aplicarMigraciones(url);
    console.log("La base ya tiene las tablas.");
    await asegurarSemilla(crearAlmacenNeon(url));
    console.log("La semilla de ZEEK ya está.");
    return 0;
  } catch (error: unknown) {
    console.error(mensajeDe(error));
    return 1;
  } finally {
    await cerrarPools();
  }
}

main().then((codigo) => {
  process.exit(codigo);
});
