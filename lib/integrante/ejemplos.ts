import type { Evidencia, Tarea } from "./tipos";

const PROYECTO = "zeek";

const TAREAS: Tarea[] = [
  {
    id: "stand",
    proyectoId: PROYECTO,
    titulo: "Montar el stand",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible y mesa armada",
    miembroId: "voluntario-1",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "registro",
    proyectoId: PROYECTO,
    titulo: "Registro de asistentes",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Lista de quienes llegaron al evento",
    miembroId: "voluntario-2",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "bienvenida",
    proyectoId: PROYECTO,
    titulo: "Mesa de bienvenida",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Mesa armada en la entrada",
    miembroId: "voluntario-3",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "comida",
    proyectoId: PROYECTO,
    titulo: "Comida del equipo",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Foto del comprobante de la comida",
    miembroId: "voluntario-1",
    walletCobro: "",
    estado: "pendiente",
  },
];

export function tareasEjemplo(): Tarea[] {
  return TAREAS.map((tarea) => ({ ...tarea }));
}

export function evidenciaEjemplo(tarea: Tarea): Evidencia {
  if (tarea.tipo === "reembolso") {
    return {
      id: `ejemplo-${tarea.id}`,
      tareaId: tarea.id,
      blobId: `ejemplo/${tarea.id}`,
      monto: "12.40",
      fecha: "2026-09-27",
    };
  }

  return {
    id: `ejemplo-${tarea.id}`,
    tareaId: tarea.id,
    blobId: `ejemplo/${tarea.id}`,
    monto: null,
    fecha: null,
  };
}
