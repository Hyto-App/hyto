-- Per-event membership and invites. Not applied to Neon in this change.
CREATE TABLE IF NOT EXISTS proyecto_miembros (
  proyecto_id text NOT NULL REFERENCES proyectos (id) ON DELETE CASCADE,
  usuario_id text NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  rol text NOT NULL,
  estado text NOT NULL DEFAULT 'active',
  creado_en text NOT NULL,
  PRIMARY KEY (proyecto_id, usuario_id),
  CHECK (rol IN ('organizer', 'team', 'volunteer'))
);

CREATE TABLE IF NOT EXISTS proyecto_invitaciones (
  id text PRIMARY KEY,
  proyecto_id text NOT NULL REFERENCES proyectos (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  email text,
  secreto_hash text NOT NULL UNIQUE,
  rol text NOT NULL,
  max_usos integer NOT NULL DEFAULT 1,
  usos integer NOT NULL DEFAULT 0,
  expira_en text NOT NULL,
  creado_por text NOT NULL REFERENCES usuarios (id),
  creado_en text NOT NULL,
  CHECK (tipo IN ('direct', 'code')),
  CHECK (rol IN ('team', 'volunteer')),
  CHECK (max_usos > 0),
  CHECK (usos >= 0),
  CHECK (usos <= max_usos),
  CHECK (tipo <> 'direct' OR email IS NOT NULL)
);

INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol, estado, creado_en)
SELECT p.id, p.organizador_id, 'organizer', 'active', p.creado_en
FROM proyectos p
WHERE p.organizador_id IS NOT NULL
ON CONFLICT (proyecto_id, usuario_id) DO NOTHING;

INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol, estado, creado_en)
SELECT DISTINCT t.proyecto_id, t.miembro_id, 'volunteer', 'active', p.creado_en
FROM tareas t
JOIN usuarios u ON u.id = t.miembro_id
JOIN proyectos p ON p.id = t.proyecto_id
WHERE t.miembro_id <> ''
ON CONFLICT (proyecto_id, usuario_id) DO NOTHING;
