ALTER TABLE public.distributions
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- حماية: في السنة المقفلة لا يُسمح إلا بتحويل الحالة من معلق إلى مدفوع مع بيانات التسليم
CREATE OR REPLACE FUNCTION public.guard_closed_distribution_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM fiscal_years WHERE id = OLD.fiscal_year_id;
  IF v_status = 'closed' THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
       OR NEW.fiscal_year_id IS DISTINCT FROM OLD.fiscal_year_id
       OR NEW.account_id IS DISTINCT FROM OLD.account_id
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NOT (OLD.status = 'pending' AND NEW.status = 'paid') THEN
      RAISE EXCEPTION 'في السنة المقفلة يُسمح فقط بتأكيد تسليم التوزيع المعلق';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_closed_distribution_update ON public.distributions;
CREATE TRIGGER guard_closed_distribution_update BEFORE UPDATE ON public.distributions
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_distribution_update();

CREATE OR REPLACE FUNCTION public.confirm_distribution_delivery(
  p_ids uuid[], p_paid_at date, p_method text, p_reference text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'تأكيد التسليم متاح للناظر فقط';
  END IF;
  IF p_method NOT IN ('cash','bank_transfer','cheque','other') THEN
    RAISE EXCEPTION 'طريقة التسليم غير صحيحة';
  END IF;
  IF p_paid_at IS NULL OR p_paid_at > (now() AT TIME ZONE 'Asia/Riyadh')::date THEN
    RAISE EXCEPTION 'تاريخ التسليم غير صحيح';
  END IF;
  FOR r IN
    UPDATE distributions d SET status = 'paid', paid_at = p_paid_at::timestamptz,
      payment_method = p_method, payment_reference = NULLIF(btrim(p_reference), '')
    FROM beneficiaries b
    WHERE b.id = d.beneficiary_id AND d.id = ANY(p_ids) AND d.status = 'pending'
    RETURNING d.amount, b.user_id
  LOOP
    v_count := v_count + 1;
    IF r.user_id IS NOT NULL THEN
      INSERT INTO notifications(user_id, title, message, type, link)
      VALUES (r.user_id, 'تم تسليم حصتك',
        'تم تسليم مبلغ ' || to_char(r.amount, 'FM999,999,990.00') || ' ر.س من التوزيع.',
        'success', '/beneficiary/my-share');
    END IF;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.confirm_distribution_delivery(uuid[], date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_distribution_delivery(uuid[], date, text, text) TO authenticated;