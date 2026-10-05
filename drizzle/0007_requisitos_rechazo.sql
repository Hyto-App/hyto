-- Photo requirements and Mile send-back. Nullable text. Empty requisitos keeps condicion.
-- Do not apply this file from an agent. Do not run it against Neon from CI.
-- Someone with database access must run `npm run db:migrar` before HYTO_MILE_REQUISITOS=on.
-- 0007_rechazo_plazo was not on any branch. This file is 0007. It does not add vence_en.

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS requisitos text;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS rechazo text;
ALTER TABLE veredictos ADD COLUMN IF NOT EXISTS mile text;
