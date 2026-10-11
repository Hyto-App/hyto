-- Durable payout account. Additive only: one nullable column, no default, no backfill.
-- wallet_cobro: the G… account a person's own (non-demo) sign-in reported. Signing out does not clear it.
-- Lock budget reads it first and falls back to the newest session, so NULL keeps the old behavior.
-- Do not apply this file from an agent. The Vercel build applies the drizzle folder in name order
-- (scripts/migrar-deploy.ts): previews on the Neon `preview` branch, production when this reaches main.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS wallet_cobro text;
