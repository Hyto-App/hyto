-- Communities. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. Josué runs `npm run db:migrar` before HYTO_COMUNIDADES=on.
-- With the switch off, the app does not read these tables or proyectos.comunidad_id.

CREATE TABLE IF NOT EXISTS comunidades (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  foto_url text,
  visibilidad text NOT NULL DEFAULT 'publica',
  codigo text NOT NULL UNIQUE,
  creado_en text NOT NULL,
  creador_id text NOT NULL REFERENCES usuarios (id)
);

CREATE TABLE IF NOT EXISTS comunidad_miembros (
  comunidad_id text NOT NULL REFERENCES comunidades (id) ON DELETE CASCADE,
  usuario_id text NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  rol text NOT NULL,
  creado_en text NOT NULL,
  PRIMARY KEY (comunidad_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS comunidad_solicitudes (
  id text PRIMARY KEY,
  comunidad_id text NOT NULL REFERENCES comunidades (id) ON DELETE CASCADE,
  usuario_id text NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente',
  creado_en text NOT NULL
);

ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS comunidad_id text REFERENCES comunidades (id) ON DELETE SET NULL;
