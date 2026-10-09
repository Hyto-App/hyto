import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import type { EtiquetaNota } from "@/lib/revision/razones";

export type Veredicto = "cumplió" | "parcial" | "insuficiente";

export type Decision = "pagado" | "pendiente";

/** What the receipt printed, before Hyto converted it. montoRevisado holds the dollar figure. */
export type LecturaVisible = {
  moneda: string | null;
  montoOriginal: string | null;
  /** Units of `moneda` per 1 USD used for the conversion. */
  tasa: number | null;
  fechaImpresa: string | null;
  comercio: string | null;
};

/** Mile's explanation for a photo that is no longer the current one. */
export type IntentoAnterior = {
  /** 1 for the first photo sent. */
  numero: number;
  veredicto: Veredicto | null;
  nota: number | null;
  frase: string | null;
};

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
  nota: number | null;
  frase: string | null;
  origen: "scout" | "guion" | "stub" | "error" | null;
  codigo: string | null;
  montoRevisado: string | null;
  montoConfirmado: string | null;
  fecha: string | null;
  hashPago: string | null;
  credencialUrl: string | null;
  tipoArchivo?: string | null;
  motivoCopia?: string | null;
  etiquetas?: EtiquetaNota[];
  lectura?: LecturaVisible | null;
  /** Self-written volunteer profile. Absent unless HYTO_PERFIL_VOLUNTARIO is on and the person filled it in. */
  perfilVoluntario?: { experiencia: string | null; etiquetas: string[] };
  /** Earlier photos with a verdict, oldest first. Empty or missing when there is only one attempt. */
  intentosAnteriores?: IntentoAnterior[];
  /** True when the task already has an escrow contract, so the money is reserved. */
  apartado?: boolean;
  /** Set only when Lock budget has nobody to pay: no one assigned, or no account known for that person. */
  faltaCobro?: "asignar" | "cuenta";
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
