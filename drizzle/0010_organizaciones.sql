-- Organizations (replaces Communities, #258). Additive and idempotent: the build applies drizzle/*.sql
-- on every production and preview deploy (#215). With HYTO_ORGANIZACIONES off, the app never reads these tables.
CREATE TABLE IF NOT EXISTS organizaciones (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  etiquetas text[] NOT NULL DEFAULT '{}',
  creado_en text NOT NULL,
  creador_id text NOT NULL REFERENCES usuarios (id)
);
CREATE TABLE IF NOT EXISTS organizacion_admins (
  organizacion_id text NOT NULL REFERENCES organizaciones (id) ON DELETE CASCADE,
  usuario_id text NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  creado_en text NOT NULL,
  PRIMARY KEY (organizacion_id, usuario_id)
);
CREATE TABLE IF NOT EXISTS organizacion_voluntarios (
  organizacion_id text NOT NULL REFERENCES organizaciones (id) ON DELETE CASCADE,
  email text NOT NULL,
  usuario_id text REFERENCES usuarios (id) ON DELETE SET NULL,
  nombre text,
  etiquetas text[] NOT NULL DEFAULT '{}',
  origen text NOT NULL DEFAULT 'manual',
  participaciones integer NOT NULL DEFAULT 0,
  ultima_participacion text,
  creado_en text NOT NULL,
  PRIMARY KEY (organizacion_id, email),
  CHECK (email = lower(email)),
  CHECK (origen IN ('manual', 'evento', 'invitacion'))
);
CREATE INDEX IF NOT EXISTS organizacion_admins_usuario_idx ON organizacion_admins (usuario_id);
CREATE INDEX IF NOT EXISTS organizacion_voluntarios_usuario_idx ON organizacion_voluntarios (usuario_id);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS organizacion_id text REFERENCES organizaciones (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proyectos_organizacion_idx ON proyectos (organizacion_id);
