
-- Atomic function to allocate next ICV and insert into invoice_chain in one transaction
-- This prevents race conditions (GAP-11)
CREATE OR REPLACE FUNCTION public.allocate_icv_and_chain(
  p_invoice_id uuid,
  p_invoice_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_icv int;
  v_previous_hash text;
BEGIN
  -- Lock the invoice_chain table to prevent concurrent ICV allocation
  LOCK TABLE public.invoice_chain IN EXCLUSIVE MODE;

  -- Get next ICV
  SELECT COALESCE(MAX(icv), 0) + 1 INTO v_icv FROM public.invoice_chain;

  -- Get previous hash
  SELECT invoice_hash INTO v_previous_hash
  FROM public.invoice_chain
  ORDER BY icv DESC
  LIMIT 1;

  v_previous_hash := COALESCE(v_previous_hash, '0');

  -- Insert into chain
  INSERT INTO public.invoice_chain (invoice_id, icv, invoice_hash, previous_hash)
  VALUES (p_invoice_id, v_icv, p_invoice_hash, v_previous_hash);

  RETURN jsonb_build_object(
    'icv', v_icv,
    'previous_hash', v_previous_hash
  );
END;
$$;
