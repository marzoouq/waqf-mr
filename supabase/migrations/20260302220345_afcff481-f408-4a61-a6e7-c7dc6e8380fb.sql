
-- Fix 1: beneficiaries_safe — DROP and recreate with accountant access
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_invoker=on) AS
SELECT
  id, name, share_percentage,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
    THEN national_id
    ELSE '******' || right(national_id, 4)
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
    THEN bank_account
    ELSE '******' || right(bank_account, 4)
  END AS bank_account,
  email, phone, notes, user_id, created_at, updated_at
FROM beneficiaries;

-- Fix 2: validate_advance_request_amount — use proportional total percentage
CREATE OR REPLACE FUNCTION public.validate_advance_request_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_share_pct numeric;
  v_total_pct numeric;
  v_available_amount numeric;
  v_paid_advances numeric;
  v_max_advance numeric;
  v_estimated_share numeric;
BEGIN
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = NEW.beneficiary_id;

  IF v_share_pct IS NULL THEN
    RAISE EXCEPTION 'المستفيد غير موجود';
  END IF;

  SELECT COALESCE(SUM(share_percentage), 100) INTO v_total_pct FROM beneficiaries;

  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = NEW.fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = NEW.beneficiary_id
    AND fiscal_year_id = NEW.fiscal_year_id
    AND status = 'paid'
    AND id != NEW.id;

  v_max_advance := GREATEST(0, (v_estimated_share * 0.5) - v_paid_advances);

  IF NEW.amount > v_max_advance THEN
    RAISE EXCEPTION 'مبلغ السلفة (%) يتجاوز الحد الأقصى المسموح (%) — 50%% من الحصة التقديرية', 
      NEW.amount, ROUND(v_max_advance, 2);
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix 3: cron_check_late_payments — cap total_months at end_date
CREATE OR REPLACE FUNCTION public.cron_check_late_payments()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  expected_payments int;
  total_months int;
  paid int;
  overdue int;
  overdue_amount numeric;
  msg text;
  total_overdue_contracts int := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح باستدعاء هذه الدالة';
  END IF;

  FOR rec IN
    SELECT
      c.id, c.contract_number, c.tenant_name, c.start_date, c.end_date,
      c.rent_amount, c.payment_type, c.payment_count, c.payment_amount, c.property_id,
      COALESCE(
        (SELECT count(*) FROM payment_invoices pi WHERE pi.contract_id = c.id AND pi.status = 'paid'),
        COALESCE(tp.paid_months, 0)
      ) AS paid_count
    FROM contracts c
    LEFT JOIN tenant_payments tp ON tp.contract_id = c.id
    LEFT JOIN fiscal_years fy ON fy.id = c.fiscal_year_id
    WHERE c.status = 'active'
      AND (c.fiscal_year_id IS NULL OR fy.status != 'closed')
  LOOP
    total_months := GREATEST(0,
      (EXTRACT(YEAR FROM LEAST(CURRENT_DATE, rec.end_date)) - EXTRACT(YEAR FROM rec.start_date)) * 12
      + (EXTRACT(MONTH FROM LEAST(CURRENT_DATE, rec.end_date)) - EXTRACT(MONTH FROM rec.start_date))
    );

    IF rec.payment_type = 'monthly' THEN
      expected_payments := LEAST(total_months, 12);
    ELSIF rec.payment_type = 'quarterly' THEN
      expected_payments := LEAST(FLOOR(total_months / 3.0)::int, 4);
    ELSIF rec.payment_type = 'semi_annual' OR rec.payment_type = 'semi-annual' THEN
      expected_payments := LEAST(FLOOR(total_months / 6.0)::int, 2);
    ELSIF rec.payment_type = 'annual' THEN
      IF LEAST(CURRENT_DATE, rec.end_date) >= rec.start_date + interval '1 month' THEN
        expected_payments := 1;
      ELSE
        expected_payments := 0;
      END IF;
    ELSE
      expected_payments := GREATEST(0,
        FLOOR(
          COALESCE(rec.payment_count, 1)::numeric
          * GREATEST(0, LEAST(CURRENT_DATE, rec.end_date) - rec.start_date)::numeric
          / GREATEST(1, (rec.end_date - rec.start_date))::numeric
        )
      );
      expected_payments := LEAST(expected_payments, COALESCE(rec.payment_count, 1));
    END IF;

    paid := rec.paid_count;
    overdue := expected_payments - paid;

    IF overdue > 0 THEN
      total_overdue_contracts := total_overdue_contracts + 1;
      overdue_amount := overdue * COALESCE(rec.payment_amount, rec.rent_amount / GREATEST(1, COALESCE(rec.payment_count, 1)));
      msg := 'عقد رقم ' || rec.contract_number || ' (' || rec.tenant_name || '): متأخر ' || overdue || ' دفعة بمبلغ ' || ROUND(overdue_amount, 2) || ' ر.س';

      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE title = 'تنبيه: دفعة متأخرة'
          AND message LIKE 'عقد رقم ' || rec.contract_number || '%'
          AND created_at >= CURRENT_DATE::timestamptz
        LIMIT 1
      ) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        SELECT ur.user_id, 'تنبيه: دفعة متأخرة', msg, 'warning', '/dashboard/contracts'
        FROM user_roles ur WHERE ur.role = 'admin';
      END IF;
    END IF;
  END LOOP;

  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 AND total_overdue_contracts > 0 THEN
    DECLARE
      summary_msg text;
    BEGIN
      summary_msg := 'ملخص أسبوعي: يوجد ' || total_overdue_contracts || ' عقد بدفعات متأخرة تحتاج متابعة';
      IF NOT EXISTS (
        SELECT 1 FROM notifications WHERE message = summary_msg AND created_at >= CURRENT_DATE::timestamptz LIMIT 1
      ) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        SELECT ur.user_id, 'ملخص الدفعات المتأخرة', summary_msg, 'warning', '/dashboard/contracts'
        FROM user_roles ur WHERE ur.role = 'admin';
      END IF;
    END;
  END IF;
END;
$function$;
