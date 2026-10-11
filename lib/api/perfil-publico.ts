import type { Almacen } from "@/lib/db/almacen";
import { PRIVACIDAD_POR_DEFECTO, type PrivacidadPerfil } from "@/lib/db/tipos";
import { perfilPublicoActivo, perfilVoluntarioActivo } from "@/lib/perfil/bandera";
import { calcularCifras, tareasQueCuentan, type CifrasPerfil, type EvidenciaResumen } from "@/lib/perfil/cifras";
import { iniciales } from "@/lib/perfil/iniciales";
import { esEventoDePrueba } from "@/lib/perfil/prueba";
import { fichaDe } from "@/lib/perfil/reglas";
import { calcularSugeridos, type Sugerido } from "@/lib/perfil/sugeridos";
import { validarNombre, type MotivoTexto } from "@/lib/perfil/validar";
import { nombreVisible } from "@/lib/sesion/nombre";
import { json } from "./json";

/** What the public profile page shows. Never the email, the phone or any evidence. */
export type VistaPerfil = {
  usuarioId: string;
  /** Chosen name, or null: the page then shows a neutral label. */
  nombre: string | null;
  iniciales: string;
  /** ISO date of the first event the person joined. */
  desde: string | null;
  bio: string | null;
  cifras: CifrasPerfil;
  privacidad: PrivacidadPerfil;
  /** The viewer is the profile owner. */
  propio: boolean;
};

export type ResultadoPerfil = { estado: "ok"; vista: VistaPerfil } | { estado: "no_disponible" };

export async function privacidadDe(almacen: Almacen, usuarioId: string): Promise<PrivacidadPerfil> {
  return (await almacen.leerPrivacidadPerfil(usuarioId)) ?? { ...PRIVACIDAD_POR_DEFECTO };
}

/**
 * A private profile, an unknown id and the switch off all answer the same way,
 * so the page does not reveal whether an account exists.
 */
export async function leerVistaPerfil(almacen: Almacen, usuarioId: string, visorId: string | null): Promise<ResultadoPerfil> {
  if (!perfilPublicoActivo()) return { estado: "no_disponible" };
  const id = usuarioId.trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return { estado: "no_disponible" };
  const usuario = await almacen.leerUsuario(id);
  if (!usuario) return { estado: "no_disponible" };
  const privacidad = await privacidadDe(almacen, id);
  const propio = visorId === id;
  if (!privacidad.publico && !propio) return { estado: "no_disponible" };

  const [miembros, proyectos, todas] = await Promise.all([
    almacen.miembrosDeUsuario(id),
    almacen.listarProyectos(),
    almacen.listarTareas(),
  ]);
  const suyas = todas.filter((tarea) => tarea.miembroId === id);
  const cuentan = tareasQueCuentan(id, proyectos, suyas, miembros);
  const evidencias: Record<string, EvidenciaResumen> = {};
  await Promise.all(
    cuentan.map(async (tarea) => {
      const evidencia = await almacen.ultimaEvidencia(tarea.id);
      evidencias[tarea.id] = evidencia ? { creadaEn: evidencia.creadaEn, montoConfirmado: evidencia.montoConfirmado } : null;
    }),
  );
  const cambios = await almacen.contarCambiosPedidos(cuentan.map((tarea) => tarea.id));
  const cifras = calcularCifras({
    usuarioId: id,
    proyectos,
    tareas: suyas,
    miembros,
    evidencias,
    cambios,
    mostrarMontos: privacidad.mostrarMontos,
  });
  const nombre = nombreVisible(usuario.nombre, usuario.email);
  const desde = miembros.map((miembro) => miembro.creadoEn).filter(Boolean).sort()[0] ?? null;
  const bio = perfilVoluntarioActivo() ? (fichaDe(usuario)?.experiencia ?? null) : null;
  return {
    estado: "ok",
    vista: {
      usuarioId: id,
      nombre,
      // No email here: the initials come from the name only.
      iniciales: nombre ? iniciales(nombre) : "",
      desde,
      bio,
      cifras,
      privacidad,
      propio,
    },
  };
}

/** People this organizer already worked with, plus this event's members. Empty with the switch off. */
export async function sugeridosDeEvento(almacen: Almacen, organizadorId: string, proyectoId: string): Promise<Sugerido[]> {
  if (!perfilPublicoActivo()) return [];
  const propios = (await almacen.miembrosDeUsuario(organizadorId)).filter(
    (miembro) => miembro.rol === "organizer" && miembro.estado === "active",
  );
  const ids = [...new Set([proyectoId, ...propios.map((miembro) => miembro.proyectoId)])];
  const [miembros, proyectos, tareas, usuarios] = await Promise.all([
    Promise.all(ids.map((id) => almacen.listarMiembros(id))).then((listas) => listas.flat()),
    almacen.listarProyectos(),
    almacen.listarTareas(),
    almacen.listarUsuarios(),
  ]);
  return calcularSugeridos({ organizadorId, proyectoId, proyectos, miembros, tareas, usuarios });
}

/** True when the person is an active member of an event this organizer runs. */
export async function trabajoConOrganizador(almacen: Almacen, organizadorId: string, personaId: string): Promise<boolean> {
  if (!personaId || personaId === organizadorId) return false;
  const ids = (await almacen.miembrosDeUsuario(organizadorId))
    .filter((miembro) => miembro.rol === "organizer" && miembro.estado === "active")
    .map((miembro) => miembro.proyectoId);
  // Demo and test events do not make anyone a past collaborator.
  const reales = await Promise.all(ids.map(async (id) => (esEventoDePrueba(await almacen.leerProyecto(id)) ? null : id)));
  const propios = new Set(reales.filter((id): id is string => id !== null));
  if (propios.size === 0) return false;
  return (await almacen.miembrosDeUsuario(personaId)).some((miembro) => miembro.estado === "active" && propios.has(miembro.proyectoId));
}

const AVISOS_NOMBRE: Record<MotivoTexto, { aviso: string; clave: string }> = {
  corto: { aviso: "Write a name of at least 2 letters.", clave: "perfilPublico.errorNombreCorto" },
  largo: { aviso: "The name can have up to 60 characters.", clave: "perfilPublico.errorNombreLargo" },
  html: { aviso: "The name cannot have code or symbols like < >.", clave: "perfilPublico.errorHtml" },
  contacto: { aviso: "Do not put an email or phone number in your name.", clave: "perfilPublico.errorContacto" },
  tipo: { aviso: "Write a name of at least 2 letters.", clave: "perfilPublico.errorNombreCorto" },
};

const NO = () => json({ aviso: "Not found." }, 404);

export async function leerAjustesPerfilHttp(almacen: Almacen, usuarioId: string): Promise<Response> {
  if (!perfilPublicoActivo()) return NO();
  const usuario = await almacen.leerUsuario(usuarioId);
  if (!usuario) return json({ aviso: "We couldn't find that account." }, 404);
  const privacidad = await privacidadDe(almacen, usuarioId);
  return json({
    nombre: nombreVisible(usuario.nombre, usuario.email) ?? "",
    publico: privacidad.publico,
    mostrarMontos: privacidad.mostrarMontos,
    enlace: `/p/${encodeURIComponent(usuarioId)}`,
  });
}

export async function guardarAjustesPerfilHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  if (!perfilPublicoActivo()) return NO();
  if (!body || typeof body !== "object") return json({ aviso: "Send the settings as JSON.", clave: "perfilPublico.noGuarda" }, 400);
  const crudo = body as Record<string, unknown>;
  const usuario = await almacen.leerUsuario(usuarioId);
  if (!usuario) return json({ aviso: "We couldn't find that account." }, 404);
  for (const campo of ["publico", "mostrarMontos"] as const) {
    if (crudo[campo] !== undefined && typeof crudo[campo] !== "boolean") {
      return json({ aviso: "Send the settings as JSON.", clave: "perfilPublico.noGuarda" }, 400);
    }
  }
  let nombre: string | null = null;
  if (crudo.nombre !== undefined) {
    const validado = validarNombre(crudo.nombre);
    if (!validado.ok) return json(AVISOS_NOMBRE[validado.motivo], 400);
    nombre = validado.valor;
  }
  const actual = await privacidadDe(almacen, usuarioId);
  const siguiente: PrivacidadPerfil = {
    publico: typeof crudo.publico === "boolean" ? crudo.publico : actual.publico,
    mostrarMontos: typeof crudo.mostrarMontos === "boolean" ? crudo.mostrarMontos : actual.mostrarMontos,
  };
  const cambiaPrivacidad = crudo.publico !== undefined || crudo.mostrarMontos !== undefined;
  if (cambiaPrivacidad && !(await almacen.guardarPrivacidadPerfil(usuarioId, siguiente))) {
    return json({ aviso: "Profile settings are not ready yet.", clave: "perfilPublico.noListo" }, 503);
  }
  if (nombre !== null && nombre !== usuario.nombre) await almacen.guardarNombre(usuarioId, nombre);
  return json({
    nombre: nombre ?? nombreVisible(usuario.nombre, usuario.email) ?? "",
    publico: siguiente.publico,
    mostrarMontos: siguiente.mostrarMontos,
    enlace: `/p/${encodeURIComponent(usuarioId)}`,
  });
}
