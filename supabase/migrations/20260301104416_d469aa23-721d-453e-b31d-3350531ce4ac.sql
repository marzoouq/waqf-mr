
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
      COALESCE(tp.paid_months, 0) AS paid_months
    FROM contracts c
    LEFT JOIN tenant_payments tp ON tp.contract_id = c.id
    WHERE c.status = 'active'
  LOOP
    -- حساب عدد الأشهر المنقضية من بداية العقد
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
      -- متعدد الدفعات: حسب عدد الأشهر المنقضية نسبياً
      expected_payments := GREATEST(0,
        FLOOR(
          COALESCE(rec.payment_count, 1)::numeric
          * GREATEST(0, CURRENT_DATE - rec.start_date)::numeric
          / GREATEST(1, (rec.end_date - rec.start_date))::numeric
        )
      );
      expected_payments := LEAST(expected_payments, COALESCE(rec.payment_count, 1));
    END IF;

    paid := rec.paid_months;
    overdue := expected_payments - paid;

    IF overdue > 0 THEN
      total_overdue_contracts := total_overdue_contracts + 1;
      overdue_amount := overdue * COALESCE(rec.payment_amount, rec.rent_amount / GREATEST(1, COALESCE(rec.payment_count, 1)));

      msg := 'عقد رقم ' || rec.contract_number || ' (' || rec.tenant_name || '): متأخر ' || overdue || ' دفعة بمبلغ ' || ROUND(overdue_amount, 2) || ' ر.س';

      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE message = msg
          AND created_at >= CURRENT_DATE::timestamptz
        LIMIT 1
      ) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        SELECT ur.user_id, 'تنبيه: دفعة متأخرة', msg, 'warning', '/dashboard/contracts'
        FROM user_roles ur WHERE ur.role = 'admin';
      END IF;
    END IF;
  END LOOP;

  -- ملخص أسبوعي (الأحد)
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
