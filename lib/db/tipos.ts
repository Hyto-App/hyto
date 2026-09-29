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
