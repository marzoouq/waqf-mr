
-- GAP-9: Add ZATCA columns to payment_invoices
ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS zatca_xml text,
  ADD COLUMN IF NOT EXISTS invoice_hash text,
  ADD COLUMN IF NOT EXISTS icv integer,
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'simplified';
