import { pgTable, text } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  rol: text("rol").notNull(),
});

// Hyto asume un solo organizador por despliegue. proyectos no tiene dueño:
// cualquier sesión con rol organizador puede desplegar y liberar esa tarea.
export const proyectos = pgTable("proyectos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  creadoEn: text("creado_en").notNull(),
});

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
});

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
});

export const sesiones = pgTable("sesiones", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  usuarioId: text("usuario_id").notNull(),
  rol: text("rol").notNull(),
  expiraEn: text("expira_en").notNull(),
  wallet: text("wallet").notNull().default(""),
});
