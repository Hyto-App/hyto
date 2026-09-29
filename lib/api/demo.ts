import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { clienteDe, excedido } from "@/lib/escrow/limite";
import { encabezadoCookie, expiracion, tokenSesion } from "@/lib/sesion/cookie";
import { demoHabilitado, rolDemoDe, usuarioDemo } from "@/lib/sesion/demo";
import { baseNoLista, json } from "./json";

export async function estadoDemoHttp(env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env): Promise<Response> {
  return json({ habilitado: demoHabilitado(env) });
}

export async function crearDemoHttp(
  request: Request,
  almacen: Almacen,
  env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env,
): Promise<Response> {
  if (!demoHabilitado(env)) return json({ aviso: "No encontrado." }, 404);
  if (excedido(`demo:${clienteDe(request)}`)) {
    return json({ aviso: "Demasiadas entradas demo. Esperá un momento." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "El cuerpo no es JSON." }, 400);
  }
  const rol = rolPedido(body);
  if (!rol) return json({ aviso: "El rol no está permitido." }, 400);

  try {
    await asegurarSemilla(almacen);
    const fijo = usuarioDemo(rol);
    await almacen.guardarUsuario(fijo);
    const usuario = await almacen.usuarioPorEmail(fijo.email);
    if (!usuario || usuario.rol !== rol) return json({ aviso: "No se pudo abrir la sesión demo." }, 500);
    const sesion = tokenSesion();
    await almacen.crearSesion({
      token: sesion,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
      expiraEn: expiracion(),
      wallet: "",
    });
    return json(
      { email: usuario.email, rol: usuario.rol, usuarioId: usuario.id, nombre: usuario.nombre, demo: true },
      200,
      { "set-cookie": encabezadoCookie(sesion) },
    );
  } catch {
    return baseNoLista();
  }
}

function rolPedido(body: unknown): ReturnType<typeof rolDemoDe> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return rolDemoDe((body as { rol?: unknown }).rol);
}
