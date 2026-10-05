import type { Veredicto } from "@/lib/admin/tipos";

export type TipoTarea = "trabajo" | "reembolso";

export type EstadoTarea = "pendiente" | "en revisión" | "pagado";

/** Timeline from mailbox #058. Absent until the member task API sends it. */
export type EtapaTarea = "en_revision" | "enviada_organizador" | "aprobada" | "rechazada";

export type PrioridadTarea = "normal" | "high";

export type DificultadTarea = "easy" | "medium" | "hard";

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
  hashPago?: string | null;
  etapa?: EtapaTarea | null;
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
