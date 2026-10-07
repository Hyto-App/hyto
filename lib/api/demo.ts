import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, asegurarVoluntarioDemo, esProyectoDemo } from "@/lib/db/semilla";
import type { SesionFila } from "@/lib/db/tipos";
import { clienteDe, excedido } from "@/lib/escrow/limite";
import { validarMontoConfirmado } from "@/lib/escrow/monto";
import { COOKIE_SESION, SESION_SIN_EXP_SEGUNDOS, encabezadoCookie, expiracion, leerCookie, tokenSesion } from "@/lib/sesion/cookie";
import { demoHabilitado, rolDemoDe, sesionEsDemo, usuarioDemo } from "@/lib/sesion/demo";
import { baseNoLista, json } from "./json";
import { AVISO_ORGANIZADOR, estadoOrganizadorTarea } from "./organizador";

export const AVISO_PAGO_DEMO_SIN_FOTO = "There is no photo to pay for yet.";

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

/**
 * Demo-only payment: marks a task of the seeded demo event as paid without a Stellar signature or
 * a stored hash. Real sessions never reach it (404), and a demo session still cannot sign through
 * /api/firma, so the real payment path keeps its checks.
 */
export async function pagarDemoHttp(
  almacen: Almacen,
  sesion: Pick<SesionFila, "email" | "usuarioId">,
  tareaId: string,
  env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env,
): Promise<Response> {
  if (!demoHabilitado(env) || !sesionEsDemo(sesion)) return json({ aviso: "Not found." }, 404);
  try {
    const tarea = await almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    if (!esProyectoDemo(await almacen.leerProyecto(tarea.proyectoId))) return json({ aviso: AVISO_ORGANIZADOR }, 403);
    if ((await estadoOrganizadorTarea(almacen, sesion.usuarioId, tarea.id)) !== "si") {
      return json({ aviso: AVISO_ORGANIZADOR }, 403);
    }
    if (tarea.estado === "pagado") return json({ estado: "pagado", demo: true });
    const evidencia = await almacen.ultimaEvidencia(tarea.id);
    if (tarea.estado !== "en revisión" || !evidencia) return json({ aviso: AVISO_PAGO_DEMO_SIN_FOTO }, 409);
    if (tarea.tipo === "reembolso" && !evidencia.montoConfirmado) {
      const leido = validarMontoConfirmado(evidencia.monto, tarea.tope, tarea.monto);
      const tope = validarMontoConfirmado(tarea.tope ?? tarea.monto, tarea.tope, tarea.monto);
      const elegido = "monto" in leido ? leido : tope;
      if ("monto" in elegido) await almacen.actualizarEvidencia(evidencia.id, { montoConfirmado: elegido.monto });
    }
    await almacen.actualizarTarea(tarea.id, { estado: "pagado" });
    return json({ estado: "pagado", demo: true });
  } catch {
    return baseNoLista();
  }
}

function rolPedido(body: unknown): ReturnType<typeof rolDemoDe> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return rolDemoDe((body as { rol?: unknown }).rol);
}
