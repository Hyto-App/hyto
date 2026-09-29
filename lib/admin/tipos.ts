import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export type Veredicto = "cumplió" | "parcial" | "insuficiente";

export type Decision = "pagado" | "pendiente";

export type TareaAdmin = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  miembroId: string;
  miembro: string;
  estado: EstadoTarea;
  veredicto: Veredicto | null;
  frase: string | null;
  origen: "scout" | "guion" | "stub" | "error" | null;
  codigo: string | null;
  montoRevisado: string | null;
  fecha: string | null;
  hashPago: string | null;
  credencialUrl: string | null;
};

export type TareaCreada = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
};

export type ProyectoCreado = {
  nombre: string;
  tareas: TareaCreada[];
};

export type MemoriaAdmin = {
  decisiones: Record<string, Decision>;
  proyecto: ProyectoCreado | null;
  direccion: string | null;
};

export type Resumen = {
  presupuesto: string;
  pagado: string;
  pendiente: string;
};

export type PersonaInforme = {
  miembroId: string;
  miembro: string;
  tareas: TareaAdmin[];
};

export type VistaAdmin = {
  nombre: string;
  ejemplo: boolean;
  propio: boolean;
  tareas: TareaAdmin[];
  bandeja: TareaAdmin[];
  resumen: Resumen;
  personas: PersonaInforme[];
};
