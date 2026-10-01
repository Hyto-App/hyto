import type { Almacen } from "@/lib/db/almacen";
import type { InvitacionFila, RolInvitacion, SesionFila, TipoInvitacion } from "@/lib/db/tipos";
import {
  codigoHumano,
  DIAS_INVITACION,
  expiraEnDias,
  hashSecreto,
  MAX_USOS_CODIGO,
  secretoDirecto,
} from "@/lib/invitaciones/secreto";
import { baseNoLista, json } from "./json";

const AVISO_ORGANIZADOR = "Only the organizer can invite people.";

export async function crearInvitacionHttp(
  request: Request,
  almacen: Almacen,
  sesion: SesionFila,
  proyectoId: string,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const pedido = leerPedido(body);
  if ("aviso" in pedido) return json({ aviso: pedido.aviso }, 400);
  try {
    const miembros = await almacen.listarMiembrosDe(sesion.usuarioId);
    const organiza = miembros.some(
      (miembro) => miembro.proyectoId === proyectoId && miembro.rol === "organizer" && miembro.estado === "active",
    );
    if (!organiza) return json({ aviso: AVISO_ORGANIZADOR }, 403);
    const proyecto = await almacen.leerProyecto(proyectoId);
    if (!proyecto) return json({ aviso: "We couldn't find that event." }, 404);
    const ahora = new Date();
    const secreto = pedido.tipo === "direct" ? secretoDirecto() : codigoHumano();
    const fila: InvitacionFila = {
      id: crypto.randomUUID(),
      proyectoId,
      tipo: pedido.tipo,
      email: pedido.tipo === "direct" ? pedido.email : null,
      secretoHash: hashSecreto(secreto),
      rol: pedido.rol,
      maxUsos: pedido.tipo === "direct" ? 1 : pedido.maxUsos,
      usos: 0,
      expiraEn: expiraEnDias(DIAS_INVITACION, ahora),
      creadoPor: sesion.usuarioId,
      creadoEn: ahora.toISOString(),
    };
    await almacen.crearInvitacion(fila);
    const enlace = pedido.tipo === "direct" ? `/invitar/${secreto}` : `/unirse?code=${secreto}`;
    return json(
      {
        tipo: fila.tipo,
        rol: fila.rol,
        secreto,
        enlace,
        expiraEn: fila.expiraEn,
        maxUsos: fila.maxUsos,
      },
      201,
    );
  } catch {
    return baseNoLista();
  }
}

export async function aceptarInvitacionHttp(request: Request, almacen: Almacen, sesion: SesionFila): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const secreto = secretoDe(body);
  if (!secreto) return json({ aviso: "Enter an invite code." }, 400);
  try {
    const resultado = await almacen.aceptarInvitacion({
      hash: hashSecreto(secreto),
      usuarioId: sesion.usuarioId,
      email: sesion.email,
      ahora: new Date().toISOString(),
    });
    if (!resultado.ok) return json({ aviso: avisoDe(resultado.motivo) }, resultado.motivo === "missing" ? 404 : 403);
    return json({ ok: true, proyectoId: resultado.proyectoId, rol: resultado.rol }, 200);
  } catch {
    return baseNoLista();
  }
}

function avisoDe(motivo: "missing" | "expired" | "used" | "email"): string {
  if (motivo === "expired") return "That invite has expired.";
  if (motivo === "used") return "That invite has already been used.";
  if (motivo === "email") return "This invite is for a different email.";
  return "That invite code is not valid.";
}

function secretoDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const secreto = (body as { secreto?: unknown; code?: unknown }).secreto ?? (body as { code?: unknown }).code;
  if (typeof secreto !== "string") return null;
  const limpio = secreto.trim();
  if (!limpio || limpio.length > 80) return null;
  return limpio;
}

function leerPedido(
  body: unknown,
): { tipo: TipoInvitacion; rol: RolInvitacion; email: string; maxUsos: number } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Choose a code or a direct invite." };
  const crudo = body as Record<string, unknown>;
  const tipo: TipoInvitacion | null = crudo.tipo === "direct" ? "direct" : crudo.tipo === "code" ? "code" : null;
  const rol: RolInvitacion | null = crudo.rol === "team" ? "team" : crudo.rol === "volunteer" ? "volunteer" : null;
  if (!tipo || !rol) return { aviso: "Choose a code or a direct invite." };
  const email = typeof crudo.email === "string" ? crudo.email.trim().toLowerCase() : "";
  if (tipo === "direct" && !email.includes("@")) return { aviso: "Enter an email for a direct invite." };
  let maxUsos = MAX_USOS_CODIGO;
  if (crudo.maxUsos !== undefined) {
    const numero = typeof crudo.maxUsos === "number" ? crudo.maxUsos : Number(crudo.maxUsos);
    if (!Number.isInteger(numero) || numero < 1 || numero > 500) return { aviso: "Set a use limit between 1 and 500." };
    maxUsos = numero;
  }
  return { tipo, rol, email, maxUsos };
}
