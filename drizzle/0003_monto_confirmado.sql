-- Organizer-confirmed reimbursement amount. The receipt reading stays in evidencias.monto.
-- Do not apply this against production without Esteban's approval.
ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS monto_confirmado text;
