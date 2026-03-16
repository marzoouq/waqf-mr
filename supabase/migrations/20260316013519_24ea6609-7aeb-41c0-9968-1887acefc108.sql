
-- Z-8: Add source_table column to invoice_chain for polymorphic FK validation
-- invoice_id references either invoices.id or payment_invoices.id

-- Step 1: Add source_table column with default for existing rows
ALTER TABLE public.invoice_chain
ADD COLUMN source_table text NOT NULL DEFAULT 'payment_invoices';

-- Step 2: Backfill existing rows — check if invoice_id exists in invoices table
UPDATE public.invoice_chain ic
SET source_table = 'invoices'
WHERE EXISTS (
  SELECT 1 FROM public.invoices i WHERE i.id = ic.invoice_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.payment_invoices pi WHERE pi.id = ic.invoice_id
);

-- Step 3: Add CHECK constraint for valid source_table values
ALTER TABLE public.invoice_chain
ADD CONSTRAINT invoice_chain_source_table_check
CHECK (source_table IN ('invoices', 'payment_invoices'));

-- Step 4: Validation trigger — ensures invoice_id exists in the referenced table
CREATE OR REPLACE FUNCTION public.validate_invoice_chain_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_table = 'invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in invoices', NEW.invoice_id;
    END IF;
  ELSIF NEW.source_table = 'payment_invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payment_invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in payment_invoices', NEW.invoice_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_invoice_chain_ref
BEFORE INSERT OR UPDATE ON public.invoice_chain
FOR EACH ROW
EXECUTE FUNCTION public.validate_invoice_chain_ref();
