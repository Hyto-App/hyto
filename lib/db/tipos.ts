import type { DificultadTarea, EstadoTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";

export type Rol = "organizador" | "voluntario";

export type TipoCuentaGuardado = "empresa" | "voluntario";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** Set only when HYTO_TIPO_CUENTA is on. It does not replace the per-event role. */
  tipoCuenta?: TipoCuentaGuardado | null;
  empresaNombre?: string | null;
  empresaActividad?: string | null;
  empresaDescripcion?: string | null;
  empresaFoto?: string | null;
  /** Own words. Only read when HYTO_PERFIL_VOLUNTARIO is on. */
  experiencia?: string | null;
  /** Chosen tags, at most 5. Stored as JSON text. */
  etiquetas?: string[] | null;
};

export type Proyecto = {
  id: string;
  nombre: string;
  creadoEn: string;
  organizadorId: string | null;
  /** Private Blob path of the cover photo. */
  portada?: string | null;
  /** Shown to members. */
  descripcion?: string | null;
  /** Only the AI reviewers read this. Never put it in a route response. */
  contextoIa?: string | null;
  /** Set only when HYTO_ORGANIZACIONES is on. Null keeps the event on its own. */
  organizacionId?: string | null;
};

export type Organizacion = {
  id: string;
  nombre: string;
  descripcion: string;
  etiquetas: string[];
  creadoEn: string;
  creadorId: string;
};

export type OrganizacionAdmin = {
  organizacionId: string;
  usuarioId: string;
  creadoEn: string;
};

export type OrigenContacto = "manual" | "evento" | "invitacion";

/** A volunteer contact of one organization. The email is always lowercase. */
export type OrganizacionVoluntario = {
  organizacionId: string;
  email: string;
  usuarioId: string | null;
  nombre: string | null;
  etiquetas: string[];
  origen: OrigenContacto;
  participaciones: number;
  ultimaParticipacion: string | null;
  creadoEn: string;
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
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
  /** JSON [{ id, texto }] or null. Absent until migration 0007 is applied. */
  requisitos?: string | null;
  /** JSON send-back. Absent until migration 0007 is applied. */
  rechazo?: string | null;
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
  /** JSON of the structured Mile review. Absent on the existing path. */
  mile?: string | null;
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
