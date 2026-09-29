-- Quien ya era el organizador global sigue siendo el dueño de los proyectos
-- creados antes de esta columna. La cuenta fija del demo no cuenta: si no,
-- ORDER BY id elegiría demo-organizador antes que el usuario de producción.
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS organizador_id text REFERENCES usuarios (id);

UPDATE proyectos
SET organizador_id = (
  SELECT id
  FROM usuarios
  WHERE rol = 'organizador'
    AND id <> 'demo-organizador'
  ORDER BY id
  LIMIT 1
)
WHERE organizador_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM usuarios
    WHERE rol = 'organizador'
      AND id <> 'demo-organizador'
  );
