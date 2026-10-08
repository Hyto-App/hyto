-- Community bulletin. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. Josué runs `npm run db:migrar` before HYTO_TABLON=on.
-- With the switch off, the app does not read this table.
-- Numbered 0013 so it does not collide with 0011 (account type) or 0012 (volunteer profile).

CREATE TABLE IF NOT EXISTS comunidad_avisos (
  id text PRIMARY KEY,
  comunidad_id text NOT NULL REFERENCES comunidades (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  nombre text,
  tarea_id text REFERENCES tareas (id) ON DELETE SET NULL,
  creado_en text NOT NULL
);
