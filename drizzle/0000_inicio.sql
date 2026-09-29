CREATE TABLE IF NOT EXISTS usuarios (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  nombre text NOT NULL,
  rol text NOT NULL
);

CREATE TABLE IF NOT EXISTS proyectos (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  creado_en text NOT NULL
);

CREATE TABLE IF NOT EXISTS tareas (
  id text PRIMARY KEY,
  proyecto_id text NOT NULL REFERENCES proyectos (id),
  titulo text NOT NULL,
  tipo text NOT NULL,
  monto text NOT NULL,
  tope text,
  condicion text NOT NULL DEFAULT '',
  miembro_id text NOT NULL DEFAULT '',
  wallet_cobro text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  hash_pago text,
  credencial_url text
);

CREATE TABLE IF NOT EXISTS evidencias (
  id text PRIMARY KEY,
  tarea_id text NOT NULL REFERENCES tareas (id),
  blob_id text NOT NULL,
  monto text,
  fecha text,
  creada_en text NOT NULL
);

CREATE TABLE IF NOT EXISTS veredictos (
  id text PRIMARY KEY,
  evidencia_id text NOT NULL REFERENCES evidencias (id),
  tarea_id text NOT NULL,
  veredicto text NOT NULL,
  frase text NOT NULL,
  texto_scout text NOT NULL,
  choice text NOT NULL,
  noul text NOT NULL,
  score text NOT NULL,
  origen text NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token text PRIMARY KEY,
  email text NOT NULL,
  usuario_id text NOT NULL,
  rol text NOT NULL,
  expira_en text NOT NULL
);
