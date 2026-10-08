import type {
  AvisoComunidad,
  Comunidad,
  ComunidadMiembro,
  ComunidadSolicitud,
  EstadoSolicitudComunidad,
  EvidenciaFila,
  PedidoCanje,
  Proyecto,
  ProyectoInvitacion,
  ProyectoMiembro,
  ResultadoCanje,
  SesionFila,
  TareaFila,
  TipoCuentaGuardado,
  Usuario,
  VeredictoFila,
} from "./tipos";

export type CambioTarea = Partial<
  Pick<
    TareaFila,
    | "estado"
    | "walletCobro"
    | "hashPago"
    | "contratoEscrow"
    | "miembroId"
    | "titulo"
    | "monto"
    | "tope"
    | "condicion"
    | "prioridad"
    | "dificultad"
    | "requisitos"
    | "rechazo"
  >
>;

export type Almacen = {
  listarUsuarios(): Promise<Usuario[]>;
  usuarioPorEmail(email: string): Promise<Usuario | null>;
  leerUsuario(id: string): Promise<Usuario | null>;
  insertarUsuario(usuario: Usuario): Promise<void>;
  guardarUsuario(usuario: Usuario): Promise<void>;
  guardarTipoCuenta(
    id: string,
    cambio: {
      tipoCuenta: TipoCuentaGuardado;
      empresaNombre: string | null;
      empresaActividad: string | null;
      empresaDescripcion: string | null;
      empresaFoto: string | null;
    },
  ): Promise<void>;
  guardarPerfilVoluntario(id: string, cambio: { experiencia: string | null; etiquetas: string }): Promise<void>;
  leerProyecto(id: string): Promise<Proyecto | null>;
  listarProyectos(): Promise<Proyecto[]>;
  ultimoProyecto(): Promise<Proyecto | null>;
  crearProyecto(proyecto: Proyecto, tareas: TareaFila[]): Promise<void>;
  actualizarProyecto(id: string, cambio: Partial<Pick<Proyecto, "portada" | "descripcion" | "contextoIa">>): Promise<void>;
  asignarOrganizador(proyectoId: string, organizadorId: string): Promise<void>;
  listarTareas(): Promise<TareaFila[]>;
  leerTarea(id: string): Promise<TareaFila | null>;
  actualizarTarea(id: string, cambio: CambioTarea): Promise<void>;
  crearEvidencia(evidencia: EvidenciaFila): Promise<void>;
  leerEvidencia(id: string): Promise<EvidenciaFila | null>;
  actualizarEvidencia(
    id: string,
    cambio: Partial<Pick<EvidenciaFila, "monto" | "fecha" | "montoConfirmado" | "motivoCopia" | "creadaEn">>,
  ): Promise<void>;
  ultimaEvidencia(tareaId: string): Promise<EvidenciaFila | null>;
  /** Every photo sent for the task, oldest first. */
  listarEvidencias(tareaId: string): Promise<EvidenciaFila[]>;
  evidenciaPorSha256(sha256: string): Promise<EvidenciaFila | null>;
  evidenciasCercanas(
    phash: string,
    distanciaMax: number,
    exceptoId: string,
  ): Promise<{ id: string; distancia: number }[]>;
  listaParaAntifraude(): Promise<boolean>;
  /** True once migration 0007 is present. Memory is always ready. */
  columnasRequisitos(): Promise<boolean>;
  contarEvidencias(tareaId: string): Promise<number>;
  guardarVeredicto(veredicto: VeredictoFila): Promise<void>;
  /** Drops the row so a re-review is "in progress" again. No row means not reviewed yet. */
  borrarVeredicto(evidenciaId: string): Promise<void>;
  veredictoDe(evidenciaId: string): Promise<VeredictoFila | null>;
  crearSesion(sesion: SesionFila): Promise<void>;
  leerSesion(token: string): Promise<SesionFila | null>;
  borrarSesion(token: string): Promise<void>;
  guardarWallet(token: string, wallet: string): Promise<void>;
  walletDeUsuario(usuarioId: string): Promise<string | null>;
  listarMiembros(proyectoId: string): Promise<ProyectoMiembro[]>;
  miembrosDeUsuario(usuarioId: string): Promise<ProyectoMiembro[]>;
  guardarMiembro(miembro: ProyectoMiembro): Promise<void>;
  crearInvitacion(invitacion: ProyectoInvitacion): Promise<void>;
  leerInvitacionPorHash(hash: string): Promise<ProyectoInvitacion | null>;
  canjearInvitacion(pedido: PedidoCanje): Promise<ResultadoCanje>;
  listarComunidades(): Promise<Comunidad[]>;
  leerComunidad(id: string): Promise<Comunidad | null>;
  leerComunidadPorCodigo(codigo: string): Promise<Comunidad | null>;
  crearComunidad(comunidad: Comunidad): Promise<void>;
  listarMiembrosComunidad(comunidadId: string): Promise<ComunidadMiembro[]>;
  comunidadesDeUsuario(usuarioId: string): Promise<ComunidadMiembro[]>;
  miembroComunidad(comunidadId: string, usuarioId: string): Promise<ComunidadMiembro | null>;
  guardarMiembroComunidad(miembro: ComunidadMiembro): Promise<void>;
  listarSolicitudesComunidad(comunidadId: string): Promise<ComunidadSolicitud[]>;
  crearSolicitudComunidad(solicitud: ComunidadSolicitud): Promise<void>;
  actualizarSolicitudComunidad(id: string, estado: EstadoSolicitudComunidad): Promise<void>;
  fijarComunidadProyecto(proyectoId: string, comunidadId: string | null): Promise<void>;
  listarAvisosComunidad(comunidadId: string): Promise<AvisoComunidad[]>;
  crearAvisoComunidad(aviso: AvisoComunidad): Promise<void>;
  /** Assigns the task only while miembro_id is still empty. */
  tomarTarea(tareaId: string, usuarioId: string): Promise<boolean>;
};
