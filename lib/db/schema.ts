import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  rol: text("rol").notNull(),
  // Account type. Null until the person chooses. Only read when HYTO_TIPO_CUENTA is on.
  tipoCuenta: text("tipo_cuenta"),
  empresaNombre: text("empresa_nombre"),
  empresaActividad: text("empresa_actividad"),
  empresaDescripcion: text("empresa_descripcion"),
  empresaFoto: text("empresa_foto"),
  // Volunteer profile. Only read when HYTO_PERFIL_VOLUNTARIO is on.
  experiencia: text("experiencia"),
  etiquetas: text("etiquetas"),
});

// An organization owns events and keeps its own list of volunteers (contacts).
// It does not replace the per-event role. Only read when HYTO_ORGANIZACIONES is on.
export const organizaciones = pgTable("organizaciones", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  etiquetas: text("etiquetas").array().notNull().default([]),
  creadoEn: text("creado_en").notNull(),
  creadorId: text("creador_id").notNull().references(() => usuarios.id),
});

export const organizacionAdmins = pgTable("organizacion_admins", {
  organizacionId: text("organizacion_id").notNull().references(() => organizaciones.id, { onDelete: "cascade" }),
  usuarioId: text("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  creadoEn: text("creado_en").notNull(),
}, (tabla) => [
  primaryKey({ columns: [tabla.organizacionId, tabla.usuarioId] }),
  index("organizacion_admins_usuario_idx").on(tabla.usuarioId),
]);

// Contacts are keyed by organization and lowercased email. Only that organization's admins read them.
export const organizacionVoluntarios = pgTable("organizacion_voluntarios", {
  organizacionId: text("organizacion_id").notNull().references(() => organizaciones.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  usuarioId: text("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  nombre: text("nombre"),
  etiquetas: text("etiquetas").array().notNull().default([]),
  origen: text("origen").notNull().default("manual"),
  participaciones: integer("participaciones").notNull().default(0),
  ultimaParticipacion: text("ultima_participacion"),
  creadoEn: text("creado_en").notNull(),
}, (tabla) => [
  primaryKey({ columns: [tabla.organizacionId, tabla.email] }),
  index("organizacion_voluntarios_usuario_idx").on(tabla.usuarioId),
]);

// Quien crea el proyecto queda en organizador_id. El rol global de usuarios
// no autoriza el escrow ni la revisión de ese proyecto.
export const proyectos = pgTable("proyectos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  creadoEn: text("creado_en").notNull(),
  organizadorId: text("organizador_id").references(() => usuarios.id),
  // Event context. Null on events created before 0009.
  portada: text("portada"),
  descripcion: text("descripcion"),
  contextoIa: text("contexto_ia"),
  // Null keeps the event on its own. Only read when HYTO_ORGANIZACIONES is on.
  organizacionId: text("organizacion_id").references(() => organizaciones.id, { onDelete: "set null" }),
}, (tabla) => [index("proyectos_organizacion_idx").on(tabla.organizacionId)]);

export const tareas = pgTable("tareas", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id),
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull(),
  monto: text("monto").notNull(),
  tope: text("tope"),
  condicion: text("condicion").notNull().default(""),
  miembroId: text("miembro_id").notNull().default(""),
  walletCobro: text("wallet_cobro").notNull().default(""),
  estado: text("estado").notNull().default("pendiente"),
  hashPago: text("hash_pago"),
  credencialUrl: text("credencial_url"),
  contratoEscrow: text("contrato_escrow"),
  // Off-chain labels. They do not change the escrow amount or the USDC trustline.
  prioridad: text("prioridad").notNull().default("normal"),
  dificultad: text("dificultad"),
  // JSON [{ id, texto }], at most 3. Null keeps condicion.
  requisitos: text("requisitos"),
  // JSON { nota, fallidos, en, origen, intento, puntaje, nota_mile, resultados }.
  rechazo: text("rechazo"),
});

export const evidencias = pgTable("evidencias", {
  id: text("id").primaryKey(),
  tareaId: text("tarea_id")
    .notNull()
    .references(() => tareas.id),
  blobId: text("blob_id").notNull(),
  monto: text("monto"),
  fecha: text("fecha"),
  creadaEn: text("creada_en").notNull(),
  montoConfirmado: text("monto_confirmado"),
  capturadaEn: text("capturada_en"),
  frescura: text("frescura"),
  sha256: text("sha256"),
  phash: text("phash"),
  tipoArchivo: text("tipo_archivo"),
  motivoCopia: text("motivo_copia"),
}, (tabla) => [index("evidencias_sha256_idx").on(tabla.sha256), index("evidencias_phash_idx").on(tabla.phash)]);

export const veredictos = pgTable("veredictos", {
  id: text("id").primaryKey(),
  evidenciaId: text("evidencia_id")
    .notNull()
    .references(() => evidencias.id),
  tareaId: text("tarea_id").notNull(),
  veredicto: text("veredicto").notNull(),
  frase: text("frase").notNull(),
  textoScout: text("texto_scout").notNull(),
  choice: text("choice").notNull(),
  noul: text("noul").notNull(),
  score: text("score").notNull(),
  origen: text("origen").notNull(),
  // JSON of the structured Mile review. Null on the existing path.
  mile: text("mile"),
});

export const sesiones = pgTable("sesiones", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  usuarioId: text("usuario_id").notNull(),
  rol: text("rol").notNull(),
  expiraEn: text("expira_en").notNull(),
  wallet: text("wallet").notNull().default(""),
});

export const proyectoMiembros = pgTable("proyecto_miembros", {
  proyectoId: text("proyecto_id").notNull().references(() => proyectos.id, { onDelete: "cascade" }),
  usuarioId: text("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  rol: text("rol").notNull(),
  estado: text("estado").notNull().default("active"),
  creadoEn: text("creado_en").notNull(),
}, (tabla) => [primaryKey({ columns: [tabla.proyectoId, tabla.usuarioId] })]);

export const proyectoInvitaciones = pgTable("proyecto_invitaciones", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id").notNull().references(() => proyectos.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  email: text("email"),
  secretoHash: text("secreto_hash").notNull().unique(),
  rol: text("rol").notNull(),
  maxUsos: integer("max_usos").notNull().default(1),
  usos: integer("usos").notNull().default(0),
  expiraEn: text("expira_en").notNull(),
  creadoPor: text("creado_por").notNull().references(() => usuarios.id),
  creadoEn: text("creado_en").notNull(),
});
