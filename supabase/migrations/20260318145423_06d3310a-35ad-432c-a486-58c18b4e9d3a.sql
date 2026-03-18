
-- جدول الشجرة المحاسبية
CREATE TABLE public.account_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.account_categories(id) ON DELETE SET NULL,
  category_type text NOT NULL DEFAULT 'expense',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;

-- RLS: Admin + Accountant full access
CREATE POLICY "Admins can manage account_categories"
  ON public.account_categories FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage account_categories"
  ON public.account_categories FOR ALL TO public
  USING (public.has_role(auth.uid(), 'accountant'::app_role));

-- RLS: Beneficiary/Waqif read-only
CREATE POLICY "Authorized roles can view account_categories"
  ON public.account_categories FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'beneficiary'::app_role)
    OR public.has_role(auth.uid(), 'waqif'::app_role)
  );

-- Validate category_type via trigger
CREATE OR REPLACE FUNCTION validate_category_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category_type NOT IN ('income','expense','tax','distribution') THEN
    RAISE EXCEPTION 'Invalid category_type: %', NEW.category_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_category_type
  BEFORE INSERT OR UPDATE ON public.account_categories
  FOR EACH ROW EXECUTE FUNCTION validate_category_type();

-- Seed 4 root categories
INSERT INTO public.account_categories (code, name, category_type, sort_order) VALUES
  ('100', 'الإيرادات', 'income', 100),
  ('200', 'المصروفات التشغيلية', 'expense', 200),
  ('300', 'الضرائب والزكاة', 'tax', 300),
  ('400', 'التوزيعات', 'distribution', 400);

-- Seed 12 child categories
INSERT INTO public.account_categories (code, name, category_type, parent_id, sort_order)
SELECT s.code, s.name, s.type, p.id, s.sort
FROM (VALUES
  ('110','إيجارات تجارية','income','100',110),
  ('120','إيجارات سكنية','income','100',120),
  ('130','إيرادات أخرى','income','100',130),
  ('210','صيانة','expense','200',210),
  ('220','خدمات (كهرباء/مياه)','expense','200',220),
  ('230','إدارية','expense','200',230),
  ('240','تأمين','expense','200',240),
  ('310','ضريبة القيمة المضافة','tax','300',310),
  ('320','زكاة','tax','300',320),
  ('410','حصة الناظر','distribution','400',410),
  ('420','حصة الواقف','distribution','400',420),
  ('430','ريع المستفيدين','distribution','400',430)
) AS s(code,name,type,parent_code,sort)
JOIN public.account_categories p ON p.code = s.parent_code;
