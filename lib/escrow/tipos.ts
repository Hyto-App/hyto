export type RedEscrow = "v2" | "v1";

export type Distribucion = {
  direccion: string;
  monto: number;
};

export type AccionFirma =
  | { accion: "fondear"; contrato: string; firmante: string; monto: number }
  | { accion: "marcar"; contrato: string; firmante: string; indice: number; estado: string; evidencia?: string }
  | { accion: "aprobar"; contrato: string; firmante: string; indice: number }
  | { accion: "liberar"; contrato: string; firmante: string; indice: number }
  | { accion: "disputar"; contrato: string; firmante: string; indice: number; motivo: string }
  | { accion: "resolver"; contrato: string; firmante: string; indice: number; distribuciones: Distribucion[] };

export type XdrListo = {
  xdr: string;
  hashPreparado: string;
  contrato: string | null;
};

export type PagoEnviado = {
  hash: string | null;
  ledger: number | null;
  codigo: string | null;
  contrato: string | null;
  estado: string | null;
  mensaje: string | null;
};

export type OpcionesRed = {
  fetch?: typeof fetch;
  clave?: string;
  base?: string;
  red?: RedEscrow;
};

export type TrustlineDespliegue = {
  contractId?: string;
  symbol: string;
  address?: string;
};

export type CuentasDespliegue = {
  red: RedEscrow;
  firmante: string;
  organizador: string;
  receptor: string;
  proveedor: string;
  admin: string | null;
  plataforma: string;
  resolutor: string;
  monto: number;
  titulo: string;
  descripcion: string;
  hito: string;
  engagementId: string;
  trustline: TrustlineDespliegue;
  comision: number;
};

export type Pedido = {
  ruta: string;
  cuerpo: Record<string, unknown>;
};
