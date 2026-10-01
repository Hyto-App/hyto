import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, asegurarVoluntarioDemo } from "@/lib/db/semilla";
import { clienteDe, excedido } from "@/lib/escrow/limite";
import { COOKIE_SESION, SESION_SIN_EXP_SEGUNDOS, encabezadoCookie, expiracion, leerCookie, tokenSesion } from "@/lib/sesion/cookie";
import { demoHabilitado, rolDemoDe, sesionEsDemo, usuarioDemo } from "@/lib/sesion/demo";
import { baseNoLista, json } from "./json";

export async function estadoDemoHttp(env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env): Promise<Response> {
  return json({ habilitado: demoHabilitado(env) });
}

export async function crearDemoHttp(
  request: Request,
  almacen: Almacen,
  env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env,
): Promise<Response> {
  if (!demoHabilitado(env)) return json({ aviso: "Not found." }, 404);
  if (excedido(`demo:${clienteDe(request)}`)) {
    return json({ aviso: "Too many demo sign-ins. Wait a moment." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const rol = rolPedido(body);
  if (!rol) return json({ aviso: "That demo account is not allowed." }, 400);

  try {
    await asegurarSemilla(almacen);
    await asegurarVoluntarioDemo(almacen);
    const fijo = usuarioDemo(rol);
    await almacen.guardarUsuario(fijo);
    const usuario = await almacen.usuarioPorEmail(fijo.email);
    if (!usuario || usuario.rol !== rol) return json({ aviso: "Could not open the demo session." }, 500);
    const previa = leerCookie(request, COOKIE_SESION);
    if (previa) {
      const sesionPrevia = await almacen.leerSesion(previa);
      if (sesionPrevia && sesionEsDemo(sesionPrevia)) await almacen.borrarSesion(previa);
    }
    const sesion = tokenSesion();
    await almacen.crearSesion({
      token: sesion,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
      expiraEn: expiracion(SESION_SIN_EXP_SEGUNDOS),
      wallet: "",
    });
    return json(
      { email: usuario.email, rol: usuario.rol, usuarioId: usuario.id, nombre: usuario.nombre, demo: true },
      200,
      { "set-cookie": encabezadoCookie(sesion, SESION_SIN_EXP_SEGUNDOS) },
    );
  } catch {
    return baseNoLista();
  }
}

function rolPedido(body: unknown): ReturnType<typeof rolDemoDe> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return rolDemoDe((body as { rol?: unknown }).rol);
}
