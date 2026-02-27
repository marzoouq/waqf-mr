
-- دالة كشف الدفعات المتأخرة وإرسال تنبيهات
CREATE OR REPLACE FUNCTION public.cron_check_late_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  expected_months int;
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
    -- حساب عدد الدفعات المتوقعة حتى الآن
    IF rec.payment_type = 'monthly' THEN
      -- شهري: عدد الأشهر من بداية العقد حتى اليوم
      expected_months := GREATEST(0,
        (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM rec.start_date)) * 12
        + (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM rec.start_date))
      );
      -- لا نتجاوز 12 (أقصى حد سنوي)
      expected_months := LEAST(expected_months, 12);
    ELSIF rec.payment_type = 'annual' THEN
      -- سنوي: دفعة واحدة متوقعة بعد شهر من البداية
      IF CURRENT_DATE >= rec.start_date + interval '1 month' THEN
        expected_months := 1;
      ELSE
        expected_months := 0;
      END IF;
    ELSE
      -- متعدد الدفعات: حسب عدد الأشهر المنقضية نسبياً
      expected_months := GREATEST(0,
        FLOOR(
          COALESCE(rec.payment_count, 1)::numeric
          * GREATEST(0, CURRENT_DATE - rec.start_date)::numeric
          / GREATEST(1, (rec.end_date - rec.start_date))::numeric
        )
      );
      expected_months := LEAST(expected_months, COALESCE(rec.payment_count, 1));
    END IF;

    paid := rec.paid_months;
    overdue := expected_months - paid;

    IF overdue > 0 THEN
      total_overdue_contracts := total_overdue_contracts + 1;
      overdue_amount := overdue * COALESCE(rec.payment_amount, rec.rent_amount / GREATEST(1, COALESCE(rec.payment_count, 1)));

      msg := 'عقد رقم ' || rec.contract_number || ' (' || rec.tenant_name || '): متأخر ' || overdue || ' دفعة بمبلغ ' || ROUND(overdue_amount, 2) || ' ر.س';

      -- لا نكرر نفس الإشعار في نفس اليوم
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

-- صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO postgres;
GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO service_role;
GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO authenticated;
