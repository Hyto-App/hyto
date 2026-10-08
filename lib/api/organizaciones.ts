import type { Almacen } from "@/lib/db/almacen";
import type { Organizacion, OrganizacionVoluntario } from "@/lib/db/tipos";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { esAdminDeOrganizacion } from "@/lib/organizaciones/contactos";
import {
  leerAltaOrganizacion,
  leerCambioOrganizacion,
  leerEtiquetas,
  leerNombreContacto,
  normalizarCorreo,
  sugeridosDe,
} from "@/lib/organizaciones/reglas";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

const NO_ENCONTRADO = "Not found.";
const SOLO_ADMINS = "Only an admin of this organization can do that.";

/** With the flag off every organization route answers as if it did not exist. */
export function organizacionesApagadas(): Response | null {
  return organizacionesActivas() ? null : json({ aviso: NO_ENCONTRADO }, 404);
}

function publica(organizacion: Organizacion) {
  return {
    id: organizacion.id,
    nombre: organizacion.nombre,
    descripcion: organizacion.descripcion,
    etiquetas: organizacion.etiquetas,
    creadoEn: organizacion.creadoEn,
  };
}

function vistaContacto(contacto: OrganizacionVoluntario) {
  return {
    email: contacto.email,
    nombre: contacto.nombre,
    etiquetas: contacto.etiquetas,
    origen: contacto.origen,
    participaciones: contacto.participaciones,
    ultimaParticipacion: contacto.ultimaParticipacion,
    tieneCuenta: contacto.usuarioId !== null,
  };
}

/** The organization when the user is one of its admins. Otherwise the answer to send back. */
async function comoAdmin(almacen: Almacen, organizacionId: string, usuarioId: string): Promise<Organizacion | Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const organizacion = await almacen.leerOrganizacion(organizacionId);
  if (!organizacion) return json({ aviso: "We couldn't find that organization." }, 404);
  if (!(await esAdminDeOrganizacion(almacen, organizacionId, usuarioId))) return json({ aviso: SOLO_ADMINS }, 403);
  return organizacion;
}

export async function listarOrganizacionesHttp(almacen: Almacen, usuarioId: string): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const propias = await almacen.adminsDeUsuario(usuarioId);
  const lista: Organizacion[] = [];
  for (const admin of propias) {
    const organizacion = await almacen.leerOrganizacion(admin.organizacionId);
    if (organizacion) lista.push(organizacion);
  }
  lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return json({ organizaciones: lista.map(publica) });
}

export async function crearOrganizacionHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const alta = leerAltaOrganizacion(body);
  if ("aviso" in alta) return json({ aviso: alta.aviso }, 400);
  const ahora = new Date().toISOString();
  const organizacion: Organizacion = {
    id: crypto.randomUUID(),
    nombre: alta.nombre,
    descripcion: alta.descripcion,
    etiquetas: alta.etiquetas,
    creadoEn: ahora,
    creadorId: usuarioId,
  };
  await almacen.crearOrganizacion(organizacion, { organizacionId: organizacion.id, usuarioId, creadoEn: ahora });
  return json({ organizacion: publica(organizacion) }, 201);
}

export async function leerOrganizacionHttp(almacen: Almacen, usuarioId: string, organizacionId: string): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const proyectos = await almacen.listarProyectos();
  const eventos = proyectos
    .filter((proyecto) => proyecto.organizacionId === organizacionId)
    .map((proyecto) => ({ id: proyecto.id, nombre: proyecto.nombre, creadoEn: proyecto.creadoEn }));
  return json({ organizacion: publica(organizacion), eventos });
}

export async function editarOrganizacionHttp(
  almacen: Almacen,
  usuarioId: string,
  organizacionId: string,
  body: unknown,
): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const cambio = leerCambioOrganizacion(body);
  if ("aviso" in cambio) return json({ aviso: cambio.aviso }, 400);
  await almacen.actualizarOrganizacion(organizacionId, cambio);
  return json({ organizacion: publica({ ...organizacion, ...cambio }) });
}

async function vistaAdmins(almacen: Almacen, organizacionId: string) {
  const admins = await almacen.listarAdmins(organizacionId);
  return Promise.all(
    admins.map(async (admin) => {
      const usuario = await almacen.leerUsuario(admin.usuarioId);
      return {
        usuarioId: admin.usuarioId,
        email: usuario?.email ?? "",
        nombre: usuario?.nombre ?? "",
        creadoEn: admin.creadoEn,
      };
    }),
  );
}

export async function listarAdminsHttp(almacen: Almacen, usuarioId: string, organizacionId: string): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  return json({ admins: await vistaAdmins(almacen, organizacionId) });
}

export async function agregarAdminHttp(almacen: Almacen, usuarioId: string, organizacionId: string, body: unknown): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const correo = normalizarCorreo(campo(body, "email"));
  if (!correo) return json({ aviso: "Enter a valid email." }, 400);
  const usuario = await almacen.usuarioPorEmail(correo);
  if (!usuario) return json({ aviso: "This person needs a Hyto account first.", codigo: "sin_cuenta" }, 404);
  await almacen.guardarAdmin({ organizacionId, usuarioId: usuario.id, creadoEn: new Date().toISOString() });
  return json({ admins: await vistaAdmins(almacen, organizacionId) });
}

export async function quitarAdminHttp(almacen: Almacen, usuarioId: string, organizacionId: string, body: unknown): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const objetivo = campo(body, "usuarioId");
  if (typeof objetivo !== "string" || !objetivo.trim()) return json({ aviso: "Choose an admin." }, 400);
  const admins = await almacen.listarAdmins(organizacionId);
  if (!admins.some((admin) => admin.usuarioId === objetivo.trim())) return json({ aviso: "That person is not an admin." }, 404);
  if (admins.length <= 1) {
    return json({ aviso: "An organization needs at least one admin.", codigo: "ultimo_admin" }, 409);
  }
  await almacen.quitarAdmin(organizacionId, objetivo.trim());
  return json({ admins: await vistaAdmins(almacen, organizacionId) });
}

export async function listarContactosHttp(almacen: Almacen, usuarioId: string, organizacionId: string): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const contactos = await almacen.listarVoluntarios(organizacionId);
  contactos.sort((a, b) => a.email.localeCompare(b.email));
  return json({ contactos: contactos.map(vistaContacto) });
}

export async function agregarContactoHttp(almacen: Almacen, usuarioId: string, organizacionId: string, body: unknown): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const correo = normalizarCorreo(campo(body, "email"));
  if (!correo) return json({ aviso: "Enter a valid email." }, 400);
  const nombre = leerNombreContacto(campo(body, "nombre"));
  if ("aviso" in nombre) return json({ aviso: nombre.aviso }, 400);
  const etiquetas = leerEtiquetas(campo(body, "etiquetas"));
  if ("aviso" in etiquetas) return json({ aviso: etiquetas.aviso }, 400);
  const previo = await almacen.leerVoluntario(organizacionId, correo);
  const usuario = await almacen.usuarioPorEmail(correo);
  const ahora = new Date().toISOString();
  const contacto: OrganizacionVoluntario = previo
    ? {
        ...previo,
        usuarioId: previo.usuarioId ?? usuario?.id ?? null,
        nombre: nombre.nombre ?? previo.nombre,
        etiquetas: unir(previo.etiquetas, etiquetas.etiquetas),
      }
    : {
        organizacionId,
        email: correo,
        usuarioId: usuario?.id ?? null,
        nombre: nombre.nombre,
        etiquetas: etiquetas.etiquetas,
        origen: "manual",
        participaciones: 0,
        ultimaParticipacion: null,
        creadoEn: ahora,
      };
  await almacen.guardarVoluntario(contacto);
  return json({ contacto: vistaContacto(contacto) }, previo ? 200 : 201);
}

export async function editarContactoHttp(almacen: Almacen, usuarioId: string, organizacionId: string, body: unknown): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const correo = normalizarCorreo(campo(body, "email"));
  if (!correo) return json({ aviso: "Enter a valid email." }, 400);
  const previo = await almacen.leerVoluntario(organizacionId, correo);
  if (!previo) return json({ aviso: "That contact is not in this organization." }, 404);
  const siguiente = { ...previo };
  if (campo(body, "etiquetas") !== undefined) {
    const etiquetas = leerEtiquetas(campo(body, "etiquetas"));
    if ("aviso" in etiquetas) return json({ aviso: etiquetas.aviso }, 400);
    siguiente.etiquetas = etiquetas.etiquetas;
  }
  if (campo(body, "nombre") !== undefined) {
    const nombre = leerNombreContacto(campo(body, "nombre"));
    if ("aviso" in nombre) return json({ aviso: nombre.aviso }, 400);
    siguiente.nombre = nombre.nombre;
  }
  await almacen.guardarVoluntario(siguiente);
  return json({ contacto: vistaContacto(siguiente) });
}

export async function quitarContactoHttp(almacen: Almacen, usuarioId: string, organizacionId: string, body: unknown): Promise<Response> {
  const organizacion = await comoAdmin(almacen, organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const correo = normalizarCorreo(campo(body, "email"));
  if (!correo) return json({ aviso: "Enter a valid email." }, 400);
  if (!(await almacen.leerVoluntario(organizacionId, correo))) {
    return json({ aviso: "That contact is not in this organization." }, 404);
  }
  await almacen.quitarVoluntario(organizacionId, correo);
  return json({ ok: true });
}

/**
 * Contacts for the picker of an event that belongs to an organization. Only the event's organizer
 * who is also an admin of that organization gets them.
 */
export async function contactosDeEventoHttp(almacen: Almacen, usuarioId: string, proyectoId: string): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const proyecto = await almacen.leerProyecto(proyectoId);
  if (!proyecto) return json({ aviso: "We couldn't find that event." }, 404);
  if (!(await esOrganizador(almacen, proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer can invite people." }, 403);
  }
  if (!proyecto.organizacionId) return json({ aviso: "This event is not in an organization." }, 404);
  const organizacion = await comoAdmin(almacen, proyecto.organizacionId, usuarioId);
  if (organizacion instanceof Response) return organizacion;
  const contactos = await almacen.listarVoluntarios(organizacion.id);
  const miembros = new Set((await almacen.listarMiembros(proyectoId)).filter((m) => m.estado === "active").map((m) => m.usuarioId));
  const vista = (contacto: OrganizacionVoluntario) => ({
    ...vistaContacto(contacto),
    enElEvento: contacto.usuarioId !== null && miembros.has(contacto.usuarioId),
  });
  const guardados = [...contactos].sort((a, b) => a.email.localeCompare(b.email));
  return json({
    organizacion: { id: organizacion.id, nombre: organizacion.nombre },
    sugeridos: sugeridosDe(contactos, organizacion.etiquetas).map(vista),
    guardados: guardados.map(vista),
  });
}

/** The organization an event is created in. Null when none was asked for or the flag is off. */
export function organizacionDeAlta(body: unknown): string | null | Response {
  if (!organizacionesActivas()) return null;
  if (!body || typeof body !== "object" || !("organizacionId" in body)) return null;
  const valor = (body as { organizacionId?: unknown }).organizacionId;
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string") return json({ aviso: "That organization is not valid." }, 400);
  const id = valor.trim();
  if (!id || id.length > 80 || /\s/.test(id)) return json({ aviso: "That organization is not valid." }, 400);
  return id;
}

/** An event can only join an organization where its creator is an admin. */
export async function rechazoSiNoEsAdmin(almacen: Almacen, organizacionId: string, usuarioId: string): Promise<Response | null> {
  if (!(await almacen.leerOrganizacion(organizacionId))) return json({ aviso: "We couldn't find that organization." }, 404);
  if (!(await esAdminDeOrganizacion(almacen, organizacionId, usuarioId))) {
    return json({ aviso: "Only an admin of that organization can create events in it." }, 403);
  }
  return null;
}

/** The JSON body, or the 400 to send back. DELETE and PATCH read their target from it. */
export async function cuerpoJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
}

function campo(body: unknown, nombre: string): unknown {
  if (!body || typeof body !== "object") return undefined;
  return (body as Record<string, unknown>)[nombre];
}

function unir(actuales: readonly string[], nuevas: readonly string[]): string[] {
  const vistas = new Set(actuales.map((etiqueta) => etiqueta.toLowerCase()));
  const resultado = [...actuales];
  for (const etiqueta of nuevas) {
    if (vistas.has(etiqueta.toLowerCase())) continue;
    vistas.add(etiqueta.toLowerCase());
    resultado.push(etiqueta);
  }
  return resultado;
}
