import type { Veredicto } from "@/lib/admin/tipos";

export type TipoTarea = "trabajo" | "reembolso";

export type EstadoTarea = "pendiente" | "en revisión" | "pagado";

/** Timeline from mailbox #058. Absent until the member task API sends it. */
export type EtapaTarea = "en_revision" | "enviada_organizador" | "aprobada" | "rechazada";

export type PrioridadTarea = "normal" | "high";

export type DificultadTarea = "easy" | "medium" | "hard";

export type OrigenRechazo = "mile" | "organizador";

/** One point of the #058 contract. At most 3. `cumple` stays null until a review says so. */
export type RequisitoRevision = {
  id: string;
  texto: string;
  cumple: boolean | null;
  motivo: string | null;
};

/** Organizer (or Mile) send-back. Stored later by the backend; the client only reads it. */
export type Rechazo = {
  nota: string | null;
  fallidos: number[];
  en: string | null;
  origen: OrigenRechazo | null;
};

export type Tarea = {
  id: string;
  proyectoId: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  miembroId: string;
  walletCobro: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
  nota?: number | null;
  veredicto?: Veredicto | null;
  /** Deadline. Optional until the backend sends it (spec §9); only shown when present. */
  venceEn?: string | null;
  /** True only while the task is still pending and the review sent it back. */
  rechazada?: boolean;
  rechazo?: Rechazo | null;
  /** How many photos were sent. Absent or 0 means the API has not counted them yet. */
  intentos?: number;
  ultimaEvidenciaId?: string | null;
  organizador?: { nombre: string } | null;
  hashPago?: string | null;
  etapa?: EtapaTarea | null;
  requisitos?: RequisitoRevision[];
  /** Confirmed reimbursement amount, when the API sends one. */
  montoPagado?: string | null;
  /** ISO-8601 instant the latest photo was sent (`enviada_en`). */
  enviadaEn?: string | null;
};

export type Evidencia = {
  id: string;
  tareaId: string;
  blobId: string;
  monto: string | null;
  fecha: string | null;
};

export type IdentidadDemo = {
  id: string;
  nombre: string;
  email: string;
};

export type EstadoCuenta = "undeployed" | "ready" | "needs-device-approval";

export type BilleteraCobro = {
  address: string;
  status: EstadoCuenta;
  execute: (amount: bigint, destination: string) => Promise<string>;
  addTrustline: (asset: { code: string; issuer: string }) => Promise<string>;
};

export type CuentaLista = {
  direccion: string;
  usdcListo: boolean;
  detalle: string | null;
};
