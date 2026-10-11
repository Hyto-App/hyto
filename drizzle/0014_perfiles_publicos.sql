-- Public profiles, phase 1. Additive only. Do not apply this file from an agent.
-- Do not run it against Neon from CI. Josué runs `npm run db:backup` and then
-- `npm run db:migrar` before HYTO_PERFIL_PUBLICO=on.
-- With the switch off, the app does not read or write these tables.
-- Numbered 0014 so it follows 0013 (bulletin). It does not alter existing tables.

-- One row per person who changed a setting. No row means the defaults:
-- the profile is public and amounts are hidden. Values are 'si' or 'no' (text, like veredictos.noul).
CREATE TABLE IF NOT EXISTS perfil_privacidad (
  usuario_id text PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  publico text NOT NULL DEFAULT 'si',
  mostrar_montos text NOT NULL DEFAULT 'no',
  actualizado_en text NOT NULL
);

-- Every time an organizer asks for another photo. Mile's automatic send-backs
-- are not stored here, so a retry after a Mile error does not count as a change.
CREATE TABLE IF NOT EXISTS tarea_cambios_pedidos (
  id text PRIMARY KEY,
  tarea_id text NOT NULL REFERENCES tareas (id) ON DELETE CASCADE,
  pedido_por text NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  creado_en text NOT NULL
);

CREATE INDEX IF NOT EXISTS tarea_cambios_pedidos_tarea_idx ON tarea_cambios_pedidos (tarea_id);
