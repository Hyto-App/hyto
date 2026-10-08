import { createHash, randomBytes } from "node:crypto";
import type { Almacen } from "@/lib/db/almacen";
import type { ProyectoInvitacion, RolInvitacion, TipoInvitacion } from "@/lib/db/tipos";
import { anotarFalloCanje, canjeBloqueado, clienteDe } from "@/lib/escrow/limite";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { registrarInvitado, registrarParticipacion } from "@/lib/organizaciones/contactos";
import { json } from "./json";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DIAS = 7;
const MAX_CODIGO = 500;

export function hashSecreto(secreto: string): string {
  return createHash("sha256").update(secreto.trim()).digest("hex");
}

export function codigoHumano(): string {
  const bytes = randomBytes(12);
  let cuerpo = "";
  for (const byte of bytes) cuerpo += ALFABETO[byte % ALFABETO.length];
  return `HYTO-${cuerpo}`;
}

export function tokenDirecto(): string {
  return randomBytes(24).toString("base64url");
}

export async function esOrganizador(almacen: Almacen, proyectoId: string, usuarioId: string): Promise<boolean> {
  const miembros = await almacen.listarMiembros(proyectoId);
  return miembros.some((miembro) => miembro.usuarioId === usuarioId && miembro.rol === "organizer" && miembro.estado === "active");
}

export async function crearInvitacionHttp(
  request: Request,
  almacen: Almacen,
  proyectoId: string,
  creadoPor: string,
): Promise<Response> {
  if (!(await esOrganizador(almacen, proyectoId, creadoPor))) {
    return json({ aviso: "Only the organizer can invite people." }, 403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const pedido = leerPedido(body);
  if ("aviso" in pedido) return json({ aviso: pedido.aviso }, 400);
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + DIAS * 24 * 60 * 60 * 1000);
  const secreto = pedido.tipo === "code" ? codigoHumano() : tokenDirecto();
  const fila: ProyectoInvitacion = {
    id: crypto.randomUUID(),
    proyectoId,
    tipo: pedido.tipo,
    email: pedido.tipo === "direct" ? pedido.email : null,
    secretoHash: hashSecreto(secreto),
    rol: pedido.rol,
    maxUsos: pedido.tipo === "direct" ? 1 : pedido.maxUsos,
    usos: 0,
    expiraEn: expira.toISOString(),
    creadoPor,
    creadoEn: ahora.toISOString(),
  };
  await almacen.crearInvitacion(fila);
  if (pedido.tipo === "direct") await registrarInvitado(almacen, proyectoId, pedido.email);
  return json({ secreto, tipo: fila.tipo, rol: fila.rol, expiraEn: fila.expiraEn, maxUsos: fila.maxUsos }, 201);
}

export async function canjearInvitacionHttp(request: Request, almacen: Almacen, usuarioId: string, email: string): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const secreto = secretoDe(body);
  if (!secreto) return json({ aviso: "That code is not valid." }, 400);
  const claves = [`canje:user:${usuarioId}`, `canje:ip:${clienteDe(request)}`];
  if (claves.some((clave) => canjeBloqueado(clave))) {
    return json({ aviso: "Too many failed codes. Wait 15 minutes and try again." }, 429);
  }
  const secretoHash = hashSecreto(secreto);
  // Read before redeeming: the first join of each event is the one that counts for an organization.
  const yaEraMiembro = organizacionesActivas() ? await eraMiembro(almacen, secretoHash, usuarioId) : true;
  const resultado = await almacen.canjearInvitacion({
    secretoHash,
    usuarioId,
    email,
    ahora: new Date().toISOString(),
  });
  if (!resultado.ok) {
    for (const clave of claves) anotarFalloCanje(clave);
    return json({ aviso: avisoCanje(resultado.motivo) }, 400);
  }
  if (resultado.rol !== "organizer") await registrarParticipacion(almacen, resultado.proyectoId, usuarioId, yaEraMiembro);
  return json({ proyectoId: resultado.proyectoId, rol: resultado.rol });
}

async function eraMiembro(almacen: Almacen, secretoHash: string, usuarioId: string): Promise<boolean> {
  const invitacion = await almacen.leerInvitacionPorHash(secretoHash);
  if (!invitacion) return true;
  const miembros = await almacen.listarMiembros(invitacion.proyectoId);
  return miembros.some((miembro) => miembro.usuarioId === usuarioId);
}

function avisoCanje(motivo: "missing" | "expired" | "used" | "email"): string {
  if (motivo === "expired") return "This invite has expired.";
  if (motivo === "used") return "This invite has already been used.";
  if (motivo === "email") return "This invite is for a different email.";
  return "That code is not valid.";
}

function secretoDe(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const secreto = (body as { secreto?: unknown }).secreto;
  return typeof secreto === "string" ? secreto.trim() : "";
}

function leerPedido(
  body: unknown,
): { tipo: TipoInvitacion; email: string; rol: RolInvitacion; maxUsos: number } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Choose a code or a direct invite." };
  const crudo = body as Record<string, unknown>;
  const tipo: TipoInvitacion | null = crudo.tipo === "direct" ? "direct" : crudo.tipo === "code" ? "code" : null;
  if (!tipo) return { aviso: "Choose a code or a direct invite." };
  const rol: RolInvitacion = crudo.rol === "team" ? "team" : "volunteer";
  const email = typeof crudo.email === "string" ? crudo.email.trim().toLowerCase() : "";
  if (tipo === "direct" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { aviso: "A direct invite needs an email." };
  }
  let maxUsos = 50;
  if (crudo.maxUsos !== undefined) {
    const numero = typeof crudo.maxUsos === "number" ? crudo.maxUsos : Number(crudo.maxUsos);
    if (!Number.isInteger(numero) || numero < 1 || numero > MAX_CODIGO) {
      return { aviso: "Uses must be a whole number from 1 to 500." };
    }
    maxUsos = numero;
  }
  return { tipo, email, rol, maxUsos };
}
