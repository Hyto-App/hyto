-- «¿Para cuándo?» in Crear proyecto. Additive only: one nullable column, no default, no backfill.
-- fecha: the day everything should be ready, as YYYY-MM-DD text (like the other dates in this schema).
-- Null keeps every project created before this file as it was.
-- The Vercel build applies drizzle/*.sql in name order (scripts/migrar-deploy.ts):
-- previews on the Neon `preview` branch, production when this reaches main.

ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha text;
