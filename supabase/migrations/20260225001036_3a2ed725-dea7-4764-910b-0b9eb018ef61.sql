
-- 1. إنشاء جدول طلبات السُلف
CREATE TABLE public.advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  fiscal_year_id uuid REFERENCES public.fiscal_years(id),
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. إضافة عمود fiscal_year_id للتوزيعات
ALTER TABLE public.distributions ADD COLUMN IF NOT EXISTS fiscal_year_id uuid REFERENCES public.fiscal_years(id);

-- 3. تفعيل RLS على جدول السُلف
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS للسُلف

-- الناظر والمحاسب: صلاحيات كاملة
CREATE POLICY "Admins can manage advance_requests"
ON public.advance_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can manage advance_requests"
ON public.advance_requests FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

-- المستفيد: عرض طلباته فقط
CREATE POLICY "Beneficiaries can view own advance_requests"
ON public.advance_requests FOR SELECT
USING (
  beneficiary_id IN (
    SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
  )
);

-- المستفيد: إنشاء طلب جديد (pending فقط)
CREATE POLICY "Beneficiaries can create advance_requests"
ON public.advance_requests FOR INSERT
WITH CHECK (
  beneficiary_id IN (
    SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- 5. Trigger تدقيق على جدول السُلف
CREATE TRIGGER audit_advance_requests
AFTER INSERT OR UPDATE OR DELETE ON public.advance_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 6. Trigger منع التعديل في السنة المغلقة
CREATE TRIGGER prevent_closed_fy_advance_requests
BEFORE INSERT OR UPDATE OR DELETE ON public.advance_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

-- 7. تفعيل Realtime للتوزيعات والسُلف
ALTER PUBLICATION supabase_realtime ADD TABLE public.advance_requests;
