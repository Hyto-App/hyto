-- Account type. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. The operator applies it on a Neon test branch,
-- then in production, immediately before turning HYTO_TIPO_CUENTA=on.
-- With the switch off, the app does not read these columns.
-- Order: 0010 comunidades, 0011 this file, 0012 perfil del voluntario, 0013 tablón.
-- After it is applied, read information_schema.columns for usuarios and expect
-- tipo_cuenta, empresa_nombre, empresa_actividad, empresa_descripcion, empresa_foto,
-- each nullable. This file has no DROP, UPDATE, or DELETE.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_cuenta text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_nombre text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_actividad text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_descripcion text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_foto text;
