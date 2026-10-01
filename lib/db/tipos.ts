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

export type EvidenciaFila = {
  id: string;
  tareaId: string;
  blobId: string;
  monto: string | null;
  montoConfirmado: string | null;
  fecha: string | null;
  creadaEn: string;
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

export type SesionFila = {
  token: string;
  email: string;
  usuarioId: string;
  rol: Rol;
  expiraEn: string;
  wallet: string;
};

export type RolMiembro = "organizer" | "team" | "volunteer";
export type EstadoMiembro = "active" | "removed";
export type TipoInvitacion = "direct" | "code";
export type RolInvitacion = "team" | "volunteer";

export type MiembroProyecto = {
  proyectoId: string;
  usuarioId: string;
  rol: RolMiembro;
  estado: EstadoMiembro;
  creadoEn: string;
};

export type InvitacionFila = {
  id: string;
  proyectoId: string;
  tipo: TipoInvitacion;
  email: string | null;
  secretoHash: string;
  rol: RolInvitacion;
  maxUsos: number;
  usos: number;
  expiraEn: string | null;
  creadoPor: string;
  creadoEn: string;
};

export type MotivoInvitacion = "missing" | "expired" | "used" | "email";

export type ResultadoInvitacion =
  | { ok: true; proyectoId: string; rol: RolInvitacion }
  | { ok: false; motivo: MotivoInvitacion };
