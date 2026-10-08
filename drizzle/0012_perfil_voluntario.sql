-- Volunteer profile. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. Josué runs `npm run db:migrar` before HYTO_PERFIL_VOLUNTARIO=on.
-- With the switch off, the app does not read these columns.
-- Numbered 0012. Communities use 0010, account type uses 0011, and the bulletin uses 0013.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS experiencia text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS etiquetas text;
