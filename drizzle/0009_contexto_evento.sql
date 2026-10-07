-- Event context. All three columns are nullable text. Empty keeps the event as it was.
-- portada: private Blob path of the cover photo. descripcion: shown to members.
-- contexto_ia: read only by the AI reviewers, never returned by a public route.
-- Do not apply this file from an agent. Do not run it against Neon from CI.
-- Someone with database access must run `npm run db:migrar` before this code is deployed.

ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS portada text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS contexto_ia text;
