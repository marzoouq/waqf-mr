
-- جدول فواتير الدفعات الإلكترونية
CREATE TABLE public.payment_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  fiscal_year_id UUID REFERENCES public.fiscal_years(id),
  invoice_number TEXT NOT NULL,
  payment_number INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date DATE,
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_invoices_status_check CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid')),
  CONSTRAINT payment_invoices_unique UNIQUE (contract_id, payment_number)
);

-- فهارس للأداء
CREATE INDEX idx_payment_invoices_contract ON public.payment_invoices(contract_id);
CREATE INDEX idx_payment_invoices_status ON public.payment_invoices(status);
CREATE INDEX idx_payment_invoices_due_date ON public.payment_invoices(due_date);
CREATE INDEX idx_payment_invoices_fiscal_year ON public.payment_invoices(fiscal_year_id);

-- تفعيل RLS
ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Admins can manage payment_invoices"
  ON public.payment_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can manage payment_invoices"
  ON public.payment_invoices FOR ALL
  USING (has_role(auth.uid(), 'accountant'));

CREATE POLICY "Authorized roles can view payment_invoices"
  ON public.payment_invoices FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'beneficiary') OR
    has_role(auth.uid(), 'waqif')
  );

CREATE POLICY "Restrict unpublished fiscal year data on payment_invoices"
  ON public.payment_invoices FOR SELECT
  USING (is_fiscal_year_accessible(fiscal_year_id));

-- Trigger لتحديث updated_at
CREATE TRIGGER update_payment_invoices_updated_at
  BEFORE UPDATE ON public.payment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger لسجل المراجعة
CREATE TRIGGER audit_payment_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- حماية السنوات المالية المقفلة
CREATE TRIGGER prevent_closed_fy_payment_invoices
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

-- دالة توليد فواتير لعقد معين
CREATE OR REPLACE FUNCTION public.generate_contract_invoices(
  p_contract_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_payment_count INTEGER;
  v_payment_amount NUMERIC;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_count INTEGER := 0;
  v_start DATE;
  v_end DATE;
  v_total_days INTEGER;
  v_interval INTEGER;
  v_fy RECORD;
BEGIN
  -- التحقق من الصلاحية
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;

  -- جلب بيانات العقد
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;

  -- حساب عدد الدفعات وقيمة كل دفعة
  IF v_contract.payment_type = 'monthly' THEN
    v_payment_count := 12;
  ELSIF v_contract.payment_type = 'annual' THEN
    v_payment_count := 1;
  ELSE
    v_payment_count := COALESCE(v_contract.payment_count, 1);
  END IF;

  v_payment_amount := COALESCE(v_contract.payment_amount, v_contract.rent_amount / v_payment_count);
  v_start := v_contract.start_date;
  v_end := v_contract.end_date;

  -- حذف الفواتير غير المسددة القديمة (إعادة التوليد)
  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id AND status IN ('pending', 'overdue');

  FOR i IN 1..v_payment_count LOOP
    -- حساب تاريخ الاستحقاق
    IF v_payment_count = 1 THEN
      v_due_date := v_start + INTERVAL '1 month';
    ELSIF v_contract.payment_type = 'monthly' THEN
      v_due_date := v_start + (i * INTERVAL '1 month');
    ELSE
      v_total_days := v_end - v_start;
      v_interval := v_total_days / v_payment_count;
      v_due_date := v_start + (v_interval * i);
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
    ON CONFLICT (contract_id, payment_number) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- دالة توليد فواتير لجميع العقود النشطة
CREATE OR REPLACE FUNCTION public.generate_all_active_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_total INTEGER := 0;
  v_generated INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;

  FOR v_contract IN SELECT id FROM contracts WHERE status = 'active' LOOP
    v_generated := public.generate_contract_invoices(v_contract.id);
    v_total := v_total + v_generated;
  END LOOP;

  RETURN v_total;
END;
$$;

-- دالة cron لتحديث حالة الفواتير المتأخرة يومياً
CREATE OR REPLACE FUNCTION public.cron_update_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE payment_invoices
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
           'فواتير متأخرة',
           'تم تحديث ' || v_count || ' فاتورة إلى حالة "متأخرة"',
           'warning',
           '/dashboard/contracts'
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$$;

-- صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_all_active_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cron_update_overdue_invoices() TO postgres;
