-- La columna queda vacía. Nadie es organizador mientras organizador_id sea NULL.
-- El dueño se asigna a mano en Neon, buscando al usuario por email.
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS organizador_id text REFERENCES usuarios (id);
