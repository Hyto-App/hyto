-- One row per task once a fund_escrow submit is confirmed on testnet.
-- The review screen reads it so a lagging escrow balance never offers "Finish locking" again.
-- A separate table, not a tareas column: Drizzle names every tareas column in its selects and inserts,
-- so a new column there would break task reads until this file is applied.
-- Do not apply this against production without approval. Until it is applied, fund submits still work
-- and no marker is stored.
CREATE TABLE IF NOT EXISTS fondeos_escrow (
  tarea_id text PRIMARY KEY REFERENCES tareas (id),
  contrato text NOT NULL,
  hash text NOT NULL,
  creado_en text NOT NULL
);
