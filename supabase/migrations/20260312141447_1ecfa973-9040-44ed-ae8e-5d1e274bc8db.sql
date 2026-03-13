-- Fix: unique constraint must match ON CONFLICT in generate_contract_invoices
ALTER TABLE public.payment_invoices DROP CONSTRAINT IF EXISTS payment_invoices_unique;
ALTER TABLE public.payment_invoices ADD CONSTRAINT payment_invoices_unique UNIQUE (contract_id, payment_number);