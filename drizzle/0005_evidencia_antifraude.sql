-- Camera freshness, file type, and duplicate detection for evidence.
-- Do not apply this against production without approval.
-- The app keeps reading existing evidence if these columns are still missing.
-- New uploads answer 503 until this file has been applied.

ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS capturada_en text;
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS frescura text;
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS phash text;
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS tipo_archivo text;
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS motivo_copia text;

CREATE INDEX IF NOT EXISTS evidencias_sha256_idx ON evidencias (sha256);
CREATE INDEX IF NOT EXISTS evidencias_phash_idx ON evidencias (phash);
