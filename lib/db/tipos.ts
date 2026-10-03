import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export type Rol = "organizador" | "voluntario";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

export type Proyecto = {
  id: string;
  nombre: string;
  creadoEn: string;
  organizadorId: string | null;
};

export type TareaFila = {
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
  hashPago: string | null;
  credencialUrl: string | null;
  contratoEscrow: string | null;
};

export type FondeoFila = {
  tareaId: string;
  contrato: string;
  hash: string;
  creadoEn: string;
};

export type EvidenciaFila = {
  id: string;
  tareaId: string;
  blobId: string;
  monto: string | null;
  montoConfirmado: string | null;
  fecha: string | null;
  creadaEn: string;
  capturadaEn?: string | null;
  frescura?: string | null;
  sha256?: string | null;
  phash?: string | null;
  tipoArchivo?: string | null;
  motivoCopia?: string | null;
};

export type VeredictoFila = {
  id: string;
  evidenciaId: string;
  tareaId: string;
  veredicto: "cumplió" | "parcial" | "insuficiente";
  frase: string;
  textoScout: string;
  choice: string;
  noul: "si" | "no";
  score: string;
  origen: "scout" | "guion" | "stub" | "error";
};

export type RolEvento = "organizer" | "team" | "volunteer";
export type RolInvitacion = "team" | "volunteer";
export type TipoInvitacion = "direct" | "code";
export type MotivoCanje = "missing" | "expired" | "used" | "email";

export type ProyectoMiembro = {
  proyectoId: string;
  usuarioId: string;
  rol: RolEvento;
  estado: "active" | "inactive";
  creadoEn: string;
};

export type ProyectoInvitacion = {
  id: string;
  proyectoId: string;
  tipo: TipoInvitacion;
  email: string | null;
  secretoHash: string;
  rol: RolInvitacion;
  maxUsos: number;
  usos: number;
  expiraEn: string;
  creadoPor: string;
  creadoEn: string;
};

export type PedidoCanje = {
  secretoHash: string;
  usuarioId: string;
  email: string;
  ahora: string;
};

export type ResultadoCanje = { ok: true; proyectoId: string; rol: RolEvento } | { ok: false; motivo: MotivoCanje };

export type SesionFila = {
  token: string;
  email: string;
  usuarioId: string;
  rol: Rol;
  expiraEn: string;
  wallet: string;
};
