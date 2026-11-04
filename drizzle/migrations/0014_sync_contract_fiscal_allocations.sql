CREATE OR REPLACE FUNCTION public.recompute_contract_allocations(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- لا تلمس مخصصات السنوات المغلقة
  DELETE FROM public.contract_fiscal_allocations cfa
  USING public.fiscal_years fy
  WHERE cfa.contract_id = p_contract_id
    AND fy.id = cfa.fiscal_year_id
    AND fy.status <> 'closed';

  INSERT INTO public.contract_fiscal_allocations
    (contract_id, fiscal_year_id, period_start, period_end, allocated_payments, allocated_amount)
  SELECT pi.contract_id, pi.fiscal_year_id, MIN(pi.due_date), MAX(pi.due_date),
         COUNT(*)::int, ROUND(SUM(pi.amount), 2)
  FROM public.payment_invoices pi
  JOIN public.fiscal_years fy ON fy.id = pi.fiscal_year_id
  WHERE pi.contract_id = p_contract_id
    AND pi.fiscal_year_id IS NOT NULL
    AND fy.status <> 'closed'
  GROUP BY pi.contract_id, pi.fiscal_year_id
  ON CONFLICT (contract_id, fiscal_year_id) DO UPDATE
    SET period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        allocated_payments = EXCLUDED.allocated_payments,
        allocated_amount = EXCLUDED.allocated_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_contract_allocations(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_contract_fiscal_allocations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recompute_contract_allocations(OLD.contract_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.contract_id IS DISTINCT FROM OLD.contract_id) THEN
    PERFORM public.recompute_contract_allocations(NEW.contract_id);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_contract_fiscal_allocations() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_contract_fiscal_allocations ON public.payment_invoices;
CREATE TRIGGER trg_sync_contract_fiscal_allocations
AFTER INSERT OR UPDATE OR DELETE ON public.payment_invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_contract_fiscal_allocations();

-- مزامنة أولية للعقود ذات الفواتير في السنوات المفتوحة
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT contract_id FROM public.payment_invoices LOOP
    PERFORM public.recompute_contract_allocations(r.contract_id);
  END LOOP;
END $$;