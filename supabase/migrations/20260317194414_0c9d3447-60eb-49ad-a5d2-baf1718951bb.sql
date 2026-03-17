
-- جدول بنود الفاتورة المتعددة
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL,
  invoice_source text NOT NULL DEFAULT 'payment_invoices',
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهارس
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id, invoice_source);

-- تفعيل RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Admins can manage invoice_items"
  ON public.invoice_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can manage invoice_items"
  ON public.invoice_items FOR ALL
  USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Authorized roles can view invoice_items"
  ON public.invoice_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'beneficiary')
    OR public.has_role(auth.uid(), 'waqif')
  );
