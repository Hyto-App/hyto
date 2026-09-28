export type TipoTarea = "trabajo" | "reembolso";

export type EstadoTarea = "pendiente" | "en revisión" | "pagado";

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
