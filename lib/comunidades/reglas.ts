import { randomBytes } from "node:crypto";
import type { Comunidad, VisibilidadComunidad } from "@/lib/db/tipos";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_NOMBRE = 80;
export const MAX_DESCRIPCION = 1000;
export const MAX_FOTO = 400;

export function codigoComunidad(azar: Uint8Array = randomBytes(10)): string {
  let cuerpo = "";
  for (let i = 0; i < 10; i += 1) cuerpo += ALFABETO[(azar[i] ?? 0) % ALFABETO.length];
  return cuerpo;
}

export function normalizarCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z2-9]{10}$/.test(limpio)) return null;
  for (const letra of limpio) {
    if (!ALFABETO.includes(letra)) return null;
  }
  return limpio;
}

export function esVisibilidad(valor: unknown): valor is VisibilidadComunidad {
  return valor === "publica" || valor === "privada";
}

export function filtrarPublicas(lista: readonly Comunidad[], consulta: string): Comunidad[] {
  const q = consulta.trim().toLowerCase();
  return lista.filter((comunidad) => {
    if (comunidad.visibilidad !== "publica") return false;
    if (!q) return true;
    return comunidad.nombre.toLowerCase().includes(q) || comunidad.descripcion.toLowerCase().includes(q);
  });
}

export function leerFotoUrl(valor: unknown): { ok: true; valor: string | null } | { ok: false; aviso: string } {
  if (valor === undefined || valor === null) return { ok: true, valor: null };
  if (typeof valor !== "string") return { ok: false, aviso: "The photo has to be an https URL." };
  const limpio = valor.trim();
  if (!limpio) return { ok: true, valor: null };
  if (limpio.length > MAX_FOTO) return { ok: false, aviso: "The photo URL is too long." };
  try {
    const url = new URL(limpio);
    if (url.protocol !== "https:") return { ok: false, aviso: "The photo has to be an https URL." };
    return { ok: true, valor: url.toString() };
  } catch {
    return { ok: false, aviso: "The photo has to be an https URL." };
  }
}

export type AltaComunidad = {
  nombre: string;
  descripcion: string;
  fotoUrl: string | null;
  visibilidad: VisibilidadComunidad;
};

export function leerAltaComunidad(body: unknown): AltaComunidad | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Enter a community name." };
  const crudo = body as Record<string, unknown>;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
  if (!nombre) return { aviso: "Enter a community name." };
  if (nombre.length > MAX_NOMBRE) return { aviso: `The name can have up to ${MAX_NOMBRE} characters.` };
  const descripcion = typeof crudo.descripcion === "string" ? crudo.descripcion.trim() : "";
  if (descripcion.length > MAX_DESCRIPCION) {
    return { aviso: `The description can have up to ${MAX_DESCRIPCION} characters.` };
  }
  const foto = leerFotoUrl(crudo.fotoUrl);
  if (!foto.ok) return { aviso: foto.aviso };
  const visibilidad = crudo.visibilidad === undefined ? "publica" : crudo.visibilidad;
  if (!esVisibilidad(visibilidad)) return { aviso: "Choose public or private." };
  return { nombre, descripcion, fotoUrl: foto.valor, visibilidad };
}

/** Empty or missing means the event stays without a community. */
export function leerComunidadId(valor: unknown): { id: string | null } | { aviso: string } {
  if (valor === undefined || valor === null || valor === "") return { id: null };
  if (typeof valor !== "string") return { aviso: "That community is not valid." };
  const id = valor.trim();
  if (!id || id.length > 80 || /\s/.test(id)) return { aviso: "That community is not valid." };
  return { id };
}
