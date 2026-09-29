import { tareasEjemploAdmin } from "@/lib/admin/ejemplo";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { IDENTIDADES } from "@/lib/integrante/identidades";
import type { Almacen } from "./almacen";
import type { EvidenciaFila, Proyecto, TareaFila, Usuario, VeredictoFila } from "./tipos";

export const PROYECTO_ZEEK: Proyecto = {
  id: "zeek",
  nombre: "ZEEK",
  creadoEn: "2026-09-27T12:00:00.000Z",
};

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
  return tareasEjemploAdmin().map((tarea) => ({
    id: tarea.id,
    proyectoId: PROYECTO_ZEEK.id,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    walletCobro: "",
    estado: tarea.estado,
    hashPago: tarea.hashPago,
    credencialUrl: tarea.credencialUrl,
  }));
}

export function evidenciasSemilla(): EvidenciaFila[] {
  return tareasEjemploAdmin().flatMap((tarea) => {
    if (!tarea.veredicto) return [];
    return [
      {
        id: idEjemplo(tarea.id),
        tareaId: tarea.id,
        blobId: `${MARCA_EJEMPLO}/${tarea.id}`,
        monto: tarea.montoRevisado,
        fecha: tarea.fecha,
        creadaEn: PROYECTO_ZEEK.creadoEn,
      },
    ];
  });
}

export function veredictosSemilla(): VeredictoFila[] {
  return tareasEjemploAdmin().flatMap((tarea) => {
    if (!tarea.veredicto || !tarea.frase) return [];
    const id = idEjemplo(tarea.id);
    const texto = `Ejemplo. ${tarea.frase}`;
    return [
      {
        id,
        evidenciaId: id,
        tareaId: tarea.id,
        veredicto: tarea.veredicto,
        frase: texto,
        textoScout: texto,
        choice: choiceDe(tarea),
        noul: "si",
        score: tarea.veredicto,
        origen: "guion",
      },
    ];
  });
}

export async function asegurarSemilla(almacen: Almacen): Promise<void> {
  const usuarios = await almacen.listarUsuarios();
  if (usuarios.length === 0) {
    for (const usuario of usuariosSemilla()) {
      await almacen.insertarUsuario(usuario);
    }
  }
  const proyecto = await almacen.leerProyecto(PROYECTO_ZEEK.id);
  if (!proyecto) {
    await almacen.crearProyecto(PROYECTO_ZEEK, tareasSemilla());
  }
  const estados = new Map(tareasSemilla().map((tarea) => [tarea.id, tarea.estado]));
  for (const evidencia of evidenciasSemilla()) {
    if (await almacen.leerEvidencia(evidencia.id)) continue;
    await almacen.crearEvidencia(evidencia);
    const tarea = await almacen.leerTarea(evidencia.tareaId);
    const estado = estados.get(evidencia.tareaId);
    if (tarea && estado === "en revisión" && tarea.estado === "pendiente") {
      await almacen.actualizarTarea(tarea.id, { estado: "en revisión" });
    }
  }
  for (const veredicto of veredictosSemilla()) {
    if (await almacen.veredictoDe(veredicto.evidenciaId)) continue;
    await almacen.guardarVeredicto(veredicto);
  }
}

function idEjemplo(tareaId: string): string {
  return `${MARCA_EJEMPLO}-${tareaId}`;
}

function choiceDe(tarea: TareaAdmin): string {
  if (tarea.tipo === "reembolso") return "factura";
  if (tarea.id === "stand") return "stand";
  return "trabajo";
}
