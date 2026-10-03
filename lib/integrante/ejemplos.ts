import type { Tarea } from "./tipos";

const PROYECTO = "zeek";

const TAREAS: Tarea[] = [
  {
    id: "stand",
    proyectoId: PROYECTO,
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible and the table set up",
    miembroId: "voluntario-1",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "registro",
    proyectoId: PROYECTO,
    titulo: "Check-in list",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "List of people who arrived",
    miembroId: "voluntario-2",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "bienvenida",
    proyectoId: PROYECTO,
    titulo: "Welcome table",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Table set up at the entrance",
    miembroId: "voluntario-3",
    walletCobro: "",
    estado: "pendiente",
  },
  {
    id: "comida",
    proyectoId: PROYECTO,
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Photo of the meal receipt",
    miembroId: "voluntario-1",
    walletCobro: "",
    estado: "pendiente",
  },
];

export function tareasEjemplo(): Tarea[] {
  return TAREAS.map((tarea) => ({ ...tarea }));
}
