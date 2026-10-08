-- Account type. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. Josué runs `npm run db:migrar` before HYTO_TIPO_CUENTA=on.
-- With the switch off, the app does not read these columns.
-- Numbered 0011. Communities use 0010, the volunteer profile uses 0012, and the bulletin uses 0013.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_cuenta text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_nombre text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_actividad text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_descripcion text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_foto text;
