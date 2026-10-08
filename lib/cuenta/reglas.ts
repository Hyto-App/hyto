export type TipoCuenta = "empresa" | "voluntario";

export type PerfilEmpresa = {
  tipo: "empresa";
  nombre: string;
  actividad: string;
  descripcion: string;
  fotoUrl: string | null;
};

export type PerfilVoluntario = { tipo: "voluntario" };

export type PerfilCuenta = PerfilEmpresa | PerfilVoluntario;

const MAX_NOMBRE = 80;
const MAX_ACTIVIDAD = 120;
const MAX_DESCRIPCION = 1000;
const MAX_FOTO = 400;

export function leerPerfilCuenta(body: unknown): PerfilCuenta | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Choose an account type." };
  const crudo = body as Record<string, unknown>;
  if (crudo.tipo === "voluntario") return { tipo: "voluntario" };
  if (crudo.tipo !== "empresa") return { aviso: "Choose an account type." };
  const nombre = texto(crudo.nombre, MAX_NOMBRE);
  if (!nombre) return { aviso: "Enter the community name." };
  const actividad = texto(crudo.actividad, MAX_ACTIVIDAD);
  if (!actividad) return { aviso: "Say what the community does." };
  const descripcion = texto(crudo.descripcion, MAX_DESCRIPCION);
  if (!descripcion) return { aviso: "Enter a short description." };
  const foto = crudo.fotoUrl === undefined || crudo.fotoUrl === null || crudo.fotoUrl === "" ? null : fotoDe(crudo.fotoUrl);
  if (foto === false) return { aviso: "The photo has to be an https URL." };
  return { tipo: "empresa", nombre, actividad, descripcion, fotoUrl: foto };
}

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio || limpio.length > maximo) return null;
  return limpio;
}

function fotoDe(valor: unknown): string | null | false {
  if (typeof valor !== "string") return false;
  const limpio = valor.trim();
  if (!limpio) return null;
  if (limpio.length > MAX_FOTO || !limpio.startsWith("https://") || /\s/.test(limpio)) return false;
  return limpio;
}
