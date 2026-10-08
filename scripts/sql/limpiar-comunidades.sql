-- Run by hand only after Organizations is merged and every open PR has brought main.
-- Drops nothing if any Communities table has data.
DO $$
BEGIN
  IF to_regclass('public.comunidades') IS NULL THEN
    RAISE NOTICE 'Communities tables already removed.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM comunidades)
     OR EXISTS (SELECT 1 FROM comunidad_miembros)
     OR EXISTS (SELECT 1 FROM comunidad_solicitudes)
     OR (to_regclass('public.comunidad_avisos') IS NOT NULL AND EXISTS (SELECT 1 FROM comunidad_avisos))
     OR EXISTS (SELECT 1 FROM proyectos WHERE comunidad_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Communities tables have data: nothing was dropped.';
  END IF;
  ALTER TABLE proyectos DROP COLUMN IF EXISTS comunidad_id;
  DROP TABLE IF EXISTS comunidad_avisos;
  DROP TABLE IF EXISTS comunidad_solicitudes;
  DROP TABLE IF EXISTS comunidad_miembros;
  DROP TABLE IF EXISTS comunidades;
END $$;
