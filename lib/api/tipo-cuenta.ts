import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { leerPerfilCuenta } from "@/lib/cuenta/reglas";
import type { Almacen } from "@/lib/db/almacen";
import { json } from "./json";

const NO = json({ aviso: "Not found." }, 404);

function apagado(): Response | null {
  return tipoCuentaActivo() ? null : NO;
}

export async function leerTipoCuentaHttp(almacen: Almacen, usuarioId: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const usuario = await almacen.leerUsuario(usuarioId);
  if (!usuario) return json({ aviso: "We couldn't find that account." }, 404);
  return json({ perfil: perfilDe(usuario) });
}

export async function guardarTipoCuentaHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const perfil = leerPerfilCuenta(body);
  if ("aviso" in perfil) return json({ aviso: perfil.aviso }, 400);
  const antes = await almacen.leerUsuario(usuarioId);
  if (!antes) return json({ aviso: "We couldn't find that account." }, 404);
  const cambio =
    perfil.tipo === "voluntario"
      ? { tipoCuenta: "voluntario" as const, empresaNombre: null, empresaActividad: null, empresaDescripcion: null, empresaFoto: null }
      : {
          tipoCuenta: "empresa" as const,
          empresaNombre: perfil.nombre,
          empresaActividad: perfil.actividad,
          empresaDescripcion: perfil.descripcion,
          empresaFoto: perfil.fotoUrl,
        };
  await almacen.guardarTipoCuenta(usuarioId, cambio);
  const despues = await almacen.leerUsuario(usuarioId);
  if (despues?.rol !== antes.rol) return json({ aviso: "Could not save the account type." }, 500);
  return json({ perfil: perfilDe(despues ?? { ...antes, ...cambio }) });
}

/** The organizer's company description, or null. Does not read the new columns while the switch is off. */
export async function organizacionDeEvento(almacen: Almacen, proyectoId: string): Promise<string | null> {
  if (!tipoCuentaActivo()) return null;
  try {
    const proyecto = await almacen.leerProyecto(proyectoId);
    if (!proyecto?.organizadorId) return null;
    const usuario = await almacen.leerUsuario(proyecto.organizadorId);
    if (usuario?.tipoCuenta !== "empresa") return null;
    const descripcion = usuario.empresaDescripcion?.trim() ?? "";
    return descripcion || null;
  } catch {
    return null;
  }
}

export async function faltaTipoCuenta(almacen: Almacen, usuarioId: string): Promise<boolean> {
  if (!tipoCuentaActivo()) return false;
  const usuario = await almacen.leerUsuario(usuarioId);
  return usuario?.tipoCuenta !== "empresa" && usuario?.tipoCuenta !== "voluntario";
}

function perfilDe(usuario: {
  tipoCuenta?: string | null;
  empresaNombre?: string | null;
  empresaActividad?: string | null;
  empresaDescripcion?: string | null;
  empresaFoto?: string | null;
}) {
  if (usuario.tipoCuenta === "empresa") {
    return {
      tipo: "empresa" as const,
      nombre: usuario.empresaNombre ?? "",
      actividad: usuario.empresaActividad ?? "",
      descripcion: usuario.empresaDescripcion ?? "",
      fotoUrl: usuario.empresaFoto ?? null,
    };
  }
  if (usuario.tipoCuenta === "voluntario") return { tipo: "voluntario" as const };
  return null;
}
