import type {
  EvidenciaFila,
  InvitacionFila,
  MiembroProyecto,
  Proyecto,
  ResultadoInvitacion,
  SesionFila,
  TareaFila,
  Usuario,
  VeredictoFila,
} from "./tipos";

export type Almacen = {
  listarUsuarios(): Promise<Usuario[]>;
  usuarioPorEmail(email: string): Promise<Usuario | null>;
  insertarUsuario(usuario: Usuario): Promise<void>;
  guardarUsuario(usuario: Usuario): Promise<void>;
  leerProyecto(id: string): Promise<Proyecto | null>;
  listarProyectos(): Promise<Proyecto[]>;
  ultimoProyecto(): Promise<Proyecto | null>;
  crearProyecto(proyecto: Proyecto, tareas: TareaFila[]): Promise<void>;
  asignarOrganizador(proyectoId: string, organizadorId: string): Promise<void>;
  listarTareas(): Promise<TareaFila[]>;
  leerTarea(id: string): Promise<TareaFila | null>;
  actualizarTarea(
    id: string,
    cambio: Partial<Pick<TareaFila, "estado" | "walletCobro" | "hashPago" | "contratoEscrow">>,
  ): Promise<void>;
  crearEvidencia(evidencia: EvidenciaFila): Promise<void>;
  leerEvidencia(id: string): Promise<EvidenciaFila | null>;
  actualizarEvidencia(
    id: string,
    cambio: Partial<Pick<EvidenciaFila, "monto" | "fecha" | "montoConfirmado">>,
  ): Promise<void>;
  ultimaEvidencia(tareaId: string): Promise<EvidenciaFila | null>;
  guardarVeredicto(veredicto: VeredictoFila): Promise<void>;
  veredictoDe(evidenciaId: string): Promise<VeredictoFila | null>;
  crearSesion(sesion: SesionFila): Promise<void>;
  leerSesion(token: string): Promise<SesionFila | null>;
  borrarSesion(token: string): Promise<void>;
  guardarWallet(token: string, wallet: string): Promise<void>;
  listarMiembrosDe(usuarioId: string): Promise<MiembroProyecto[]>;
  listarMiembros(proyectoId: string): Promise<MiembroProyecto[]>;
  guardarMiembro(miembro: MiembroProyecto): Promise<void>;
  crearInvitacion(invitacion: InvitacionFila): Promise<void>;
  invitacionPorHash(hash: string): Promise<InvitacionFila | null>;
  aceptarInvitacion(entrada: { hash: string; usuarioId: string; email: string; ahora: string }): Promise<ResultadoInvitacion>;
};
