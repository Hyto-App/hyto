import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { encabezadoCookie, expiracion, tokenSesion } from "@/lib/sesion/cookie";
import { correoDelToken } from "@/lib/sesion/correo";
import { baseNoLista, json } from "./json";

export async function crearSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "El cuerpo no es JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ aviso: "Falta el correo." }, 400);
  const crudo = body as Record<string, unknown>;
  const pedido = typeof crudo.email === "string" ? crudo.email : "";
  const token = typeof crudo.token === "string" ? crudo.token.trim() : "";
  const correo = await correoDelToken(token, pedido);
  if (!correo) return json({ aviso: "No se pudo confirmar el ingreso." }, 400);
  try {
    await asegurarSemilla(almacen);
    const usuario = await almacen.usuarioPorEmail(correo.correo);
    if (!usuario) return json({ aviso: "Este correo no está en el equipo." }, 403);
    const sesion = tokenSesion();
    await almacen.crearSesion({
      token: sesion,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
      expiraEn: expiracion(),
    });
    return json(
      { email: usuario.email, rol: usuario.rol, usuarioId: usuario.id, nombre: usuario.nombre },
      200,
      { "set-cookie": encabezadoCookie(sesion) },
    );
  } catch {
    return baseNoLista();
  }
}
