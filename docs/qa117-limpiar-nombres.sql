-- QA 117. Clear stored names that are only the email, or only the part before @.
-- A real name that contains @, such as 'Ana @ Norte', is left as it is.
-- This does not delete rows and does not add columns. Review the SELECT, then run the UPDATE once.
-- Do not run this from an agent against production.

SELECT id, email, nombre
FROM usuarios
WHERE btrim(nombre) <> ''
  AND (
    lower(btrim(nombre)) = lower(btrim(email))
    OR lower(btrim(nombre)) = lower(split_part(btrim(email), '@', 1))
  );

UPDATE usuarios
SET nombre = ''
WHERE btrim(nombre) <> ''
  AND (
    lower(btrim(nombre)) = lower(btrim(email))
    OR lower(btrim(nombre)) = lower(split_part(btrim(email), '@', 1))
  );
