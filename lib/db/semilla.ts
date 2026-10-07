import { tareasEjemploAdmin } from "@/lib/admin/ejemplo";
import { snapshotEjemplo } from "@/lib/revision/razones-ejemplo";
import { unirDescripcion } from "@/lib/revision/snapshot-razones";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { IDENTIDADES } from "@/lib/integrante/identidades";
import { demoHabilitado, esContratoDemo, usuarioDemo, usuariosDemo } from "@/lib/sesion/demo";
import type { Almacen } from "./almacen";
import type { EvidenciaFila, Proyecto, TareaFila, Usuario, VeredictoFila } from "./tipos";

export const PROYECTO_ZEEK: Proyecto = {
  id: "zeek",
  nombre: "ZEEK",
  creadoEn: "2026-09-27T12:00:00.000Z",
  organizadorId: null,
};

export const ID_PROYECTO_DEMO = "demo";

const CREADO_DEMO = "2026-09-27T12:00:00.000Z";

export const MARCA_EJEMPLO = "ejemplo";

export function usuariosSemilla(): Usuario[] {
  return IDENTIDADES.map((identidad) => ({
    id: identidad.id,
    email: identidad.email.trim().toLowerCase(),
    nombre: identidad.nombre,
    rol: identidad.id === "organizador" ? "organizador" : "voluntario",
  }));
}

export function tareasSemilla(): TareaFila[] {
  return filasTareas(PROYECTO_ZEEK.id, (id) => id);
}

export function tareasDemo(): TareaFila[] {
  const voluntarioId = usuarioDemo("voluntario").id;
  return filasTareas(ID_PROYECTO_DEMO, idTareaDemo).map((tarea) => ({ ...tarea, miembroId: voluntarioId }));
}

function filasTareas(proyectoId: string, idDe: (id: string) => string): TareaFila[] {
  return tareasEjemploAdmin().map((tarea) => ({
    id: idDe(tarea.id),
    proyectoId,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    walletCobro: "",
    estado: "pendiente",
    hashPago: tarea.hashPago,
    contratoEscrow: null,
    credencialUrl: tarea.credencialUrl,
    prioridad: "normal",
    dificultad: null,
  }));
}

function idTareaDemo(tareaId: string): string {
  return `demo-${tareaId}`;
}

export function esBlobEjemplo(blobId: string): boolean {
  return blobId.startsWith(`${MARCA_EJEMPLO}/`);
}

export function evidenciasSemilla(): EvidenciaFila[] {
  return filasEvidencias(PROYECTO_ZEEK.creadoEn, (id) => id, idEjemplo);
}

export function evidenciasDemo(): EvidenciaFila[] {
  return filasEvidencias(CREADO_DEMO, idTareaDemo, (id) => idEjemplo(idTareaDemo(id)));
}

function filasEvidencias(
  creadoEn: string,
  idTarea: (id: string) => string,
  idEvidencia: (id: string) => string,
): EvidenciaFila[] {
  return tareasEjemploAdmin().flatMap((tarea) => {
    if (!tarea.veredicto) return [];
    const tareaId = idTarea(tarea.id);
    return [
      {
        id: idEvidencia(tarea.id),
        tareaId,
        blobId: `${MARCA_EJEMPLO}/${tareaId}`,
        monto: tarea.montoRevisado,
        montoConfirmado: null,
        fecha: tarea.fecha,
        creadaEn: creadoEn,
      },
    ];
  });
}

export function veredictosSemilla(): VeredictoFila[] {
  return filasVeredictos((id) => id, idEjemplo);
}

export function veredictosDemo(): VeredictoFila[] {
  return filasVeredictos(idTareaDemo, (id) => idEjemplo(idTareaDemo(id)));
}

function filasVeredictos(idTarea: (id: string) => string, idEvidencia: (id: string) => string): VeredictoFila[] {
  return tareasEjemploAdmin().flatMap((tarea) => {
    if (!tarea.veredicto || !tarea.frase) return [];
    const id = idEvidencia(tarea.id);
    const texto = `Example. ${tarea.frase}`;
    return [
      {
        id,
        evidenciaId: id,
        tareaId: idTarea(tarea.id),
        veredicto: tarea.veredicto,
        frase: texto,
        textoScout: unirDescripcion(texto, snapshotEjemplo(tarea.id)),
        choice: choiceDe(tarea),
        noul: "si",
        score: tarea.nota === null ? tarea.veredicto : String(tarea.nota),
        origen: "guion",
      },
    ];
  });
}

export function esProyectoDemo(proyecto: Pick<Proyecto, "id" | "organizadorId"> | null): boolean {
  return Boolean(proyecto && proyecto.id === ID_PROYECTO_DEMO && proyecto.organizadorId === usuarioDemo("organizador").id);
}

export async function asegurarSemilla(almacen: Almacen): Promise<void> {
  const usuarios = await almacen.listarUsuarios();
  if (usuarios.length === 0) {
    for (const usuario of usuariosSemilla()) {
      await almacen.insertarUsuario(usuario);
    }
  }
  for (const usuario of usuariosDemo()) {
    await almacen.guardarUsuario(usuario);
  }
  const proyecto = await almacen.leerProyecto(PROYECTO_ZEEK.id);
  if (!proyecto) {
    await almacen.crearProyecto(PROYECTO_ZEEK, tareasSemilla());
  }
  await asegurarProyectoDemo(almacen);
  for (const evidencia of evidenciasSemilla()) {
    if (await almacen.leerEvidencia(evidencia.id)) continue;
    try {
      await almacen.crearEvidencia(evidencia);
    } catch (error) {
      if (!esClaveDuplicada(error)) throw error;
    }
  }
  for (const veredicto of veredictosSemilla()) {
    if (await almacen.veredictoDe(veredicto.evidenciaId)) continue;
    await almacen.guardarVeredicto(veredicto);
  }
  await reponerPendientes(almacen);
  await asegurarCaminoDemo(almacen);
}

async function asegurarProyectoDemo(almacen: Almacen): Promise<void> {
  if (!demoHabilitado()) return;
  const actual = await almacen.leerProyecto(ID_PROYECTO_DEMO);
  if (!actual) {
    await almacen.crearProyecto(
      {
        id: ID_PROYECTO_DEMO,
        nombre: "Demo",
        creadoEn: CREADO_DEMO,
        organizadorId: usuarioDemo("organizador").id,
      },
      tareasDemo(),
    );
  }
  for (const evidencia of evidenciasDemo()) {
    if (await almacen.leerEvidencia(evidencia.id)) continue;
    try {
      await almacen.crearEvidencia(evidencia);
    } catch (error) {
      if (!esClaveDuplicada(error)) throw error;
    }
  }
  for (const veredicto of veredictosDemo()) {
    if (await almacen.veredictoDe(veredicto.evidenciaId)) continue;
    await almacen.guardarVeredicto(veredicto);
  }
  await asegurarVoluntarioDemo(almacen);
}

export async function asegurarVoluntarioDemo(almacen: Almacen): Promise<void> {
  if (!demoHabilitado()) return;
  const voluntarioId = usuarioDemo("voluntario").id;
  for (const tarea of await almacen.listarTareas()) {
    if (tarea.proyectoId !== ID_PROYECTO_DEMO || tarea.miembroId.trim()) continue;
    await almacen.actualizarTarea(tarea.id, { miembroId: voluntarioId });
  }
  await almacen.guardarMiembro({
    proyectoId: ID_PROYECTO_DEMO,
    usuarioId: voluntarioId,
    rol: "volunteer",
    estado: "active",
    creadoEn: CREADO_DEMO,
  });
}

const MIEMBROS_MUESTRA = new Set(["voluntario-1", "voluntario-2", "voluntario-3"]);
const TAREA_DEMO_SUBIR = "demo-bienvenida";
const TAREA_DEMO_MET = "demo-stand";

export async function asegurarCaminoDemo(almacen: Almacen): Promise<void> {
  if (!demoHabilitado()) return;
  const voluntarioId = usuarioDemo("voluntario").id;
  const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === ID_PROYECTO_DEMO);
  for (const tarea of tareas) {
    if (tarea.miembroId.trim() && !MIEMBROS_MUESTRA.has(tarea.miembroId)) continue;
    if (tarea.miembroId === voluntarioId) continue;
    await almacen.actualizarTarea(tarea.id, { miembroId: voluntarioId });
  }
  const subir = await almacen.leerTarea(TAREA_DEMO_SUBIR);
  if (subir && subir.proyectoId === ID_PROYECTO_DEMO && subir.estado !== "pagado" && !subir.hashPago) {
    const evidencia = await almacen.ultimaEvidencia(subir.id);
    if (!evidencia && subir.estado !== "pendiente") {
      await almacen.actualizarTarea(subir.id, { estado: "pendiente" });
    }
  }
  await asegurarRevisionMet(almacen, voluntarioId);
}

/**
 * Undoes what a demo lock and a demo pay changed, so the next demo walks the whole flow again.
 * Only tasks of the demo event that carry a demo budget reference are touched. The upload task goes
 * back to pending; any other task goes back to review when it has a photo.
 */
export async function reiniciarPagosDemo(almacen: Almacen): Promise<void> {
  if (!demoHabilitado()) return;
  const tareas = (await almacen.listarTareas()).filter(
    (tarea) => tarea.proyectoId === ID_PROYECTO_DEMO && esContratoDemo(tarea.contratoEscrow),
  );
  for (const tarea of tareas) {
    const evidencia = await almacen.ultimaEvidencia(tarea.id);
    const estado = tarea.id !== TAREA_DEMO_SUBIR && evidencia ? "en revisión" : "pendiente";
    await almacen.actualizarTarea(tarea.id, { contratoEscrow: null, estado });
  }
}

async function asegurarRevisionMet(almacen: Almacen, voluntarioId: string): Promise<void> {
  const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === ID_PROYECTO_DEMO);
  for (const tarea of tareas) {
    if (tarea.estado === "pagado" || tarea.hashPago) continue;
    const evidencia = await almacen.ultimaEvidencia(tarea.id);
    const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    if (!veredicto || veredicto.origen === "error" || veredicto.veredicto !== "cumplió") continue;
    if (tarea.estado !== "en revisión") await almacen.actualizarTarea(tarea.id, { estado: "en revisión" });
    return;
  }
  const stand = await almacen.leerTarea(TAREA_DEMO_MET);
  if (!stand || stand.proyectoId !== ID_PROYECTO_DEMO || stand.estado === "pagado" || stand.hashPago) return;
  const evidencia = await almacen.ultimaEvidencia(stand.id);
  if (evidencia && !esBlobEjemplo(evidencia.blobId)) return;
  const plantillaEvidencia = evidenciasDemo().find((fila) => fila.tareaId === TAREA_DEMO_MET);
  const plantillaVeredicto = veredictosDemo().find((fila) => fila.tareaId === TAREA_DEMO_MET);
  if (!plantillaEvidencia || !plantillaVeredicto) return;
  if (!evidencia) {
    try {
      await almacen.crearEvidencia(plantillaEvidencia);
    } catch (error) {
      if (!esClaveDuplicada(error)) throw error;
    }
  }
  const guardado = await almacen.veredictoDe(plantillaVeredicto.evidenciaId);
  if (!guardado || guardado.origen === "error" || guardado.veredicto !== "cumplió") {
    await almacen.guardarVeredicto(plantillaVeredicto);
  }
  await almacen.actualizarTarea(stand.id, { estado: "en revisión", miembroId: stand.miembroId.trim() || voluntarioId });
}

async function reponerPendientes(almacen: Almacen): Promise<void> {
  for (const tarea of await almacen.listarTareas()) {
    if (tarea.estado !== "en revisión" || tarea.hashPago) continue;
    // The demo event keeps its sample task in review on purpose (asegurarCaminoDemo). Resetting it here
    // and restoring it there made concurrent requests read "pendiente" and hide Pay on the review screen.
    if (tarea.proyectoId === ID_PROYECTO_DEMO) continue;
    const evidencia = await almacen.ultimaEvidencia(tarea.id);
    if (evidencia && !esBlobEjemplo(evidencia.blobId)) continue;
    await almacen.actualizarTarea(tarea.id, { estado: "pendiente" });
  }
}

function esClaveDuplicada(error: unknown): boolean {
  const visto = new Set<unknown>();
  let actual: unknown = error;
  while (actual && typeof actual === "object" && !visto.has(actual)) {
    visto.add(actual);
    if ("code" in actual && actual.code === "23505") return true;
    actual = "cause" in actual ? actual.cause : undefined;
  }
  return false;
}

function idEjemplo(tareaId: string): string {
  return `${MARCA_EJEMPLO}-${tareaId}`;
}

function choiceDe(tarea: TareaAdmin): string {
  if (tarea.tipo === "reembolso") return "factura";
  if (tarea.id === "stand") return "stand";
  return "trabajo";
}
