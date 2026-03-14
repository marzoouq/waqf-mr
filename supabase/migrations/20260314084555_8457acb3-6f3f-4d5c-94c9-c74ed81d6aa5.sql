
-- جدول عناصر التقرير السنوي
CREATE TABLE public.annual_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id),
  section_type text NOT NULL DEFAULT 'achievement',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annual_report_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage annual_report_items"
  ON public.annual_report_items FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage annual_report_items"
  ON public.annual_report_items FOR ALL TO public
  USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authorized roles can view annual_report_items"
  ON public.annual_report_items FOR SELECT TO public
  USING (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

CREATE POLICY "Restrict unpublished FY on annual_report_items"
  ON public.annual_report_items
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (is_fiscal_year_accessible(fiscal_year_id));

-- جدول حالة نشر التقرير السنوي
CREATE TABLE public.annual_report_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid NOT NULL UNIQUE REFERENCES public.fiscal_years(id),
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annual_report_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage annual_report_status"
  ON public.annual_report_status FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage annual_report_status"
  ON public.annual_report_status FOR ALL TO public
  USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authorized roles can view published annual_report_status"
  ON public.annual_report_status FOR SELECT TO public
  USING (
    (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
    AND status = 'published'
  );
