
-- ===== D1 + D2 + D3 + D6: إصلاح شامل لـ generate_contract_invoices =====

-- D2: تغيير UNIQUE constraint لتشمل fiscal_year_id (دعم تجديد العقود)
ALTER TABLE public.payment_invoices DROP CONSTRAINT IF EXISTS payment_invoices_unique;
ALTER TABLE public.payment_invoices ADD CONSTRAINT payment_invoices_unique UNIQUE (contract_id, payment_number, fiscal_year_id);

-- D10: إضافة UNIQUE على invoice_number
CREATE UNIQUE INDEX IF NOT EXISTS payment_invoices_invoice_number_unique ON public.payment_invoices (invoice_number);

-- D1 + D3 + D6: إعادة كتابة generate_contract_invoices
CREATE OR REPLACE FUNCTION public.generate_contract_invoices(p_contract_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_payment_count INTEGER;
  v_payment_amount NUMERIC;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_count INTEGER := 0;
  v_start DATE;
  v_end DATE;
  v_fy RECORD;
  v_interval_months INTEGER;
BEGIN
  -- التحقق من الصلاحية
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;

  -- D1: استخدام NOT FOUND بدلاً من IS NULL
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;

  -- D3: دعم صريح لجميع أنواع الدفع
  IF v_contract.payment_type = 'monthly' THEN
    v_payment_count := 12;
    v_interval_months := 1;
  ELSIF v_contract.payment_type = 'quarterly' THEN
    v_payment_count := 4;
    v_interval_months := 3;
  ELSIF v_contract.payment_type = 'semi_annual' OR v_contract.payment_type = 'semi-annual' THEN
    v_payment_count := 2;
    v_interval_months := 6;
  ELSIF v_contract.payment_type = 'annual' THEN
    v_payment_count := 1;
    v_interval_months := 12;
  ELSE
    -- متعدد الدفعات (custom)
    v_payment_count := COALESCE(v_contract.payment_count, 1);
    v_interval_months := NULL; -- سيُحسب بالأيام
  END IF;

  v_payment_amount := COALESCE(v_contract.payment_amount, v_contract.rent_amount / v_payment_count);
  v_start := v_contract.start_date;
  v_end := v_contract.end_date;

  -- حذف الفواتير غير المسددة القديمة (إعادة التوليد)
  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id AND status IN ('pending', 'overdue');

  FOR i IN 1..v_payment_count LOOP
    -- D6: حساب تاريخ الاستحقاق بشكل صحيح
    IF v_interval_months IS NOT NULL THEN
      -- استخدام فترات شهرية — الدفعة الأخيرة لا تتجاوز end_date
      v_due_date := v_start + (i * (v_interval_months || ' months')::interval)::interval;
      -- التأكد من عدم تجاوز نهاية العقد
      IF v_due_date > v_end THEN
        v_due_date := v_end;
      END IF;
    ELSE
      -- متعدد الدفعات: توزيع متساوٍ بالأيام
      v_due_date := v_start + ((v_end - v_start) * i / v_payment_count);
    END IF;

    -- تخطي إذا كانت الفاتورة موجودة ومسددة
    IF EXISTS (
      SELECT 1 FROM payment_invoices
      WHERE contract_id = p_contract_id AND payment_number = i AND status = 'paid'
    ) THEN
      CONTINUE;
    END IF;

    -- تحديد السنة المالية
    SELECT id INTO v_fy FROM fiscal_years
    WHERE v_due_date >= start_date AND v_due_date <= end_date
    ORDER BY start_date LIMIT 1;

    -- رقم الفاتورة: رقم_العقد-INV-رقم_الدفعة
    v_invoice_number := v_contract.contract_number || '-INV-' || LPAD(i::text, 2, '0');

    INSERT INTO payment_invoices (
      contract_id, fiscal_year_id, invoice_number, payment_number,
      due_date, amount, status
    ) VALUES (
      p_contract_id,
      v_fy.id,
      v_invoice_number,
      i,
      v_due_date,
      v_payment_amount,
      CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
    )
    ON CONFLICT (contract_id, payment_number, fiscal_year_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- ===== D7: تحسين dedup الإشعارات في cron_check_late_payments =====
-- D4: استخدام payment_invoices بدلاً من tenant_payments لحساب المتأخرات
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
  dedup_key text;
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
      -- D4: حساب المدفوع من payment_invoices (إن وُجدت) أو tenant_payments كـ fallback
      COALESCE(
        (SELECT count(*) FROM payment_invoices pi WHERE pi.contract_id = c.id AND pi.status = 'paid'),
        COALESCE(tp.paid_months, 0)
      ) AS paid_count
    FROM contracts c
    LEFT JOIN tenant_payments tp ON tp.contract_id = c.id
    WHERE c.status = 'active'
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

      -- D7: dedup بالعقد فقط (بدون المبلغ) لتجنب التكرار عند تغيير المبلغ
      dedup_key := 'late_payment_' || rec.id::text;

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
