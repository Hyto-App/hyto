import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { codigoComunidad, filtrarPublicas, leerAltaComunidad, leerComunidadId, normalizarCodigo } from "@/lib/comunidades/reglas";
import type { Almacen } from "@/lib/db/almacen";
import type { Comunidad, ComunidadMiembro, ComunidadSolicitud } from "@/lib/db/tipos";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

const NO = json({ aviso: "Not found." }, 404);

function apagado(): Response | null {
  return comunidadesActivas() ? null : NO;
}

function publica(comunidad: Comunidad, codigo: boolean) {
  return {
    id: comunidad.id,
    nombre: comunidad.nombre,
    descripcion: comunidad.descripcion,
    fotoUrl: comunidad.fotoUrl,
    visibilidad: comunidad.visibilidad,
    creadoEn: comunidad.creadoEn,
    ...(codigo ? { codigo: comunidad.codigo } : {}),
  };
}

export async function listarComunidadesHttp(almacen: Almacen, usuarioId: string, consulta: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const todas = await almacen.listarComunidades();
  const propias = new Set((await almacen.comunidadesDeUsuario(usuarioId)).map((miembro) => miembro.comunidadId));
  const publicas = filtrarPublicas(todas, consulta).map((comunidad) => publica(comunidad, false));
  const mias = todas.filter((comunidad) => propias.has(comunidad.id)).map((comunidad) => publica(comunidad, false));
  return json({ publicas, mias });
}

export async function crearComunidadHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const alta = leerAltaComunidad(body);
  if ("aviso" in alta) return json({ aviso: alta.aviso }, 400);
  const ahora = new Date().toISOString();
  const comunidad: Comunidad = {
    id: crypto.randomUUID(),
    nombre: alta.nombre,
    descripcion: alta.descripcion,
    fotoUrl: alta.fotoUrl,
    visibilidad: alta.visibilidad,
    codigo: codigoComunidad(),
    creadoEn: ahora,
    creadorId: usuarioId,
  };
  await almacen.crearComunidad(comunidad);
  await almacen.guardarMiembroComunidad({
    comunidadId: comunidad.id,
    usuarioId,
    rol: "admin",
    creadoEn: ahora,
  });
  return json({ comunidad: publica(comunidad, true) }, 201);
}

export async function leerComunidadHttp(almacen: Almacen, usuarioId: string, comunidadId: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const comunidad = await almacen.leerComunidad(comunidadId);
  if (!comunidad) return json({ aviso: "We couldn't find that community." }, 404);
  const membresia = await almacen.miembroComunidad(comunidadId, usuarioId);
  const veMiembros = comunidad.visibilidad === "publica" || Boolean(membresia);
  const miembros = veMiembros ? await personas(almacen, await almacen.listarMiembrosComunidad(comunidadId)) : [];
  const solicitudes = membresia?.rol === "admin" ? await pendientes(almacen, comunidadId) : [];
  const eventos = membresia ? await eventosDe(almacen, comunidadId) : [];
  return json({
    comunidad: publica(comunidad, membresia?.rol === "admin"),
    membresia: membresia ? { rol: membresia.rol } : null,
    miembros,
    solicitudes,
    eventos,
  });
}

export async function unirseComunidadHttp(almacen: Almacen, usuarioId: string, comunidadId: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const comunidad = await almacen.leerComunidad(comunidadId);
  if (!comunidad) return json({ aviso: "We couldn't find that community." }, 404);
  const ya = await almacen.miembroComunidad(comunidadId, usuarioId);
  if (ya) return json({ ok: true, estado: "miembro" });
  if (comunidad.visibilidad === "publica") {
    await almacen.guardarMiembroComunidad({
      comunidadId,
      usuarioId,
      rol: "miembro",
      creadoEn: new Date().toISOString(),
    });
    return json({ ok: true, estado: "miembro" }, 201);
  }
  const abiertas = (await almacen.listarSolicitudesComunidad(comunidadId)).filter(
    (solicitud) => solicitud.usuarioId === usuarioId && solicitud.estado === "pendiente",
  );
  if (abiertas.length > 0) return json({ ok: true, estado: "pendiente" });
  const solicitud: ComunidadSolicitud = {
    id: crypto.randomUUID(),
    comunidadId,
    usuarioId,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  };
  await almacen.crearSolicitudComunidad(solicitud);
  return json({ ok: true, estado: "pendiente" }, 201);
}

export async function unirsePorCodigoHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const codigo = normalizarCodigo(codigoDe(body));
  if (!codigo) return json({ aviso: "That code is not valid." }, 400);
  const comunidad = await almacen.leerComunidadPorCodigo(codigo);
  if (!comunidad) return json({ aviso: "That code is not valid." }, 400);
  const ya = await almacen.miembroComunidad(comunidad.id, usuarioId);
  if (!ya) {
    await almacen.guardarMiembroComunidad({
      comunidadId: comunidad.id,
      usuarioId,
      rol: "miembro",
      creadoEn: new Date().toISOString(),
    });
  }
  return json({ ok: true, comunidadId: comunidad.id, estado: "miembro" }, ya ? 200 : 201);
}

export async function resolverSolicitudHttp(almacen: Almacen, usuarioId: string, comunidadId: string, body: unknown): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const admin = await almacen.miembroComunidad(comunidadId, usuarioId);
  if (admin?.rol !== "admin") return json({ aviso: "Only an admin can review requests." }, 403);
  const pedido = leerDecision(body);
  if ("aviso" in pedido) return json({ aviso: pedido.aviso }, 400);
  const solicitudes = await almacen.listarSolicitudesComunidad(comunidadId);
  const solicitud = solicitudes.find((item) => item.id === pedido.id);
  if (!solicitud || solicitud.estado !== "pendiente") return json({ aviso: "That request is not pending." }, 404);
  await almacen.actualizarSolicitudComunidad(solicitud.id, pedido.decision);
  if (pedido.decision === "aprobada") {
    const ya = await almacen.miembroComunidad(comunidadId, solicitud.usuarioId);
    if (!ya) {
      await almacen.guardarMiembroComunidad({
        comunidadId,
        usuarioId: solicitud.usuarioId,
        rol: "miembro",
        creadoEn: new Date().toISOString(),
      });
    }
  }
  return json({ ok: true, estado: pedido.decision });
}

export async function vincularEventoHttp(
  almacen: Almacen,
  usuarioId: string,
  comunidadId: string,
  body: unknown,
  quitar: boolean,
): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const miembro = await almacen.miembroComunidad(comunidadId, usuarioId);
  if (!miembro) return json({ aviso: "Join the community before adding an event." }, 403);
  const leido = leerComunidadId(proyectoIdDe(body));
  if ("aviso" in leido || !leido.id) return json({ aviso: "Choose an event." }, 400);
  if (!(await esOrganizador(almacen, leido.id, usuarioId))) {
    return json({ aviso: "Only the organizer of that event can link it." }, 403);
  }
  const proyecto = await almacen.leerProyecto(leido.id);
  if (!proyecto) return json({ aviso: "We couldn't find that event." }, 404);
  const rolAntes = (await almacen.listarMiembros(proyecto.id)).find((item) => item.usuarioId === usuarioId)?.rol ?? null;
  await almacen.fijarComunidadProyecto(proyecto.id, quitar ? null : comunidadId);
  const rolDespues = (await almacen.listarMiembros(proyecto.id)).find((item) => item.usuarioId === usuarioId)?.rol ?? null;
  if (rolAntes !== rolDespues) {
    return json({ aviso: "Linking an event must not change who organizes it." }, 500);
  }
  return json({ ok: true, proyectoId: proyecto.id, comunidadId: quitar ? null : comunidadId });
}

export async function comunidadDeAlta(body: unknown): Promise<string | null | Response> {
  if (!comunidadesActivas()) return null;
  if (!body || typeof body !== "object" || !("comunidadId" in body)) return null;
  const leido = leerComunidadId((body as { comunidadId?: unknown }).comunidadId);
  if ("aviso" in leido) return json({ aviso: leido.aviso }, 400);
  return leido.id;
}

async function personas(almacen: Almacen, miembros: ComunidadMiembro[]) {
  const usuarios = await almacen.listarUsuarios();
  return miembros.map((miembro) => ({
    usuarioId: miembro.usuarioId,
    nombre: usuarios.find((usuario) => usuario.id === miembro.usuarioId)?.nombre ?? "",
    rol: miembro.rol,
  }));
}

async function pendientes(almacen: Almacen, comunidadId: string) {
  const solicitudes = (await almacen.listarSolicitudesComunidad(comunidadId)).filter((solicitud) => solicitud.estado === "pendiente");
  const usuarios = await almacen.listarUsuarios();
  return solicitudes.map((solicitud) => ({
    id: solicitud.id,
    usuarioId: solicitud.usuarioId,
    nombre: usuarios.find((usuario) => usuario.id === solicitud.usuarioId)?.nombre ?? "",
    creadoEn: solicitud.creadoEn,
  }));
}

async function eventosDe(almacen: Almacen, comunidadId: string) {
  const proyectos = await almacen.listarProyectos();
  return proyectos
    .filter((proyecto) => proyecto.comunidadId === comunidadId)
    .map((proyecto) => ({ id: proyecto.id, nombre: proyecto.nombre }));
}

function codigoDe(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  return (body as { codigo?: unknown }).codigo;
}

function proyectoIdDe(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  return (body as { proyectoId?: unknown }).proyectoId;
}

function leerDecision(body: unknown): { id: string; decision: "aprobada" | "rechazada" } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Choose approve or reject." };
  const crudo = body as { solicitudId?: unknown; decision?: unknown };
  if (typeof crudo.solicitudId !== "string" || !crudo.solicitudId.trim()) return { aviso: "Choose a request." };
  if (crudo.decision !== "aprobada" && crudo.decision !== "rechazada") return { aviso: "Choose approve or reject." };
  return { id: crudo.solicitudId.trim(), decision: crudo.decision };
}
