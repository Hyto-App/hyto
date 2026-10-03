-- Priority and difficulty chosen by the organizer. Off-chain labels only.
-- They do not change the escrow amount, the receiver, or the USDC trustline.
-- Do not apply this file from an agent or against production without approval.
-- Existing rows get prioridad 'normal'. dificultad stays NULL until the organizer sets it.

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'normal';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS dificultad text;
