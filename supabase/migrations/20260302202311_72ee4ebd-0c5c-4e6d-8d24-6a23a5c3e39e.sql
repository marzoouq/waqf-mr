
-- المهمة 2: إضافة تحقق من الدور في cron_check_late_payments
CREATE OR REPLACE FUNCTION public.cron_check_late_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  rec record;
  expected_payments int;
  total_months int;
  paid int;
  overdue int;
  overdue_amount numeric;
  msg text;
  dedup_key text;
  total_overdue_contracts int := 0;
BEGIN
  -- التحقق من الصلاحية: الناظر أو المحاسب فقط (أو استدعاء من cron بدون auth.uid)
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح باستدعاء هذه الدالة';
  END IF;

  FOR rec IN
    SELECT
      c.id,
      c.contract_number,
      c.tenant_name,
      c.start_date,
      c.end_date,
      c.rent_amount,
      c.payment_type,
      c.payment_count,
      c.payment_amount,
      c.property_id,
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
      (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM rec.start_date)) * 12
      + (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM rec.start_date))
    );

    IF rec.payment_type = 'monthly' THEN
      expected_payments := LEAST(total_months, 12);
    ELSIF rec.payment_type = 'quarterly' THEN
      expected_payments := LEAST(FLOOR(total_months / 3.0)::int, 4);
    ELSIF rec.payment_type = 'semi_annual' OR rec.payment_type = 'semi-annual' THEN
      expected_payments := LEAST(FLOOR(total_months / 6.0)::int, 2);
    ELSIF rec.payment_type = 'annual' THEN
      IF CURRENT_DATE >= rec.start_date + interval '1 month' THEN
        expected_payments := 1;
      ELSE
        expected_payments := 0;
      END IF;
    ELSE
      expected_payments := GREATEST(0,
        FLOOR(
          COALESCE(rec.payment_count, 1)::numeric
          * GREATEST(0, CURRENT_DATE - rec.start_date)::numeric
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

-- المهمة 4: إزالة وصول الواقف من سياسة beneficiaries
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'accountant')
);
