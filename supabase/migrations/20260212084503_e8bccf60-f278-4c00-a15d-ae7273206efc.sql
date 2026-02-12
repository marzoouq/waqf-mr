
-- =============================================
-- 1. CREATE fiscal_years TABLE
-- =============================================
CREATE TABLE public.fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fiscal_years"
  ON public.fiscal_years FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authorized roles can view fiscal_years"
  ON public.fiscal_years FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'beneficiary'::app_role) OR
    has_role(auth.uid(), 'waqif'::app_role)
  );

-- =============================================
-- 2. ADD fiscal_year_id TO income, expenses, invoices
-- =============================================
ALTER TABLE public.income ADD COLUMN fiscal_year_id uuid REFERENCES public.fiscal_years(id);
ALTER TABLE public.expenses ADD COLUMN fiscal_year_id uuid REFERENCES public.fiscal_years(id);
ALTER TABLE public.invoices ADD COLUMN fiscal_year_id uuid REFERENCES public.fiscal_years(id);

-- =============================================
-- 3. CREATE audit_log TABLE
-- =============================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_log"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policies for users - only triggers can write

-- =============================================
-- 4. AUDIT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- =============================================
-- 5. ATTACH AUDIT TRIGGERS TO FINANCIAL TABLES
-- =============================================
CREATE TRIGGER audit_income
  AFTER INSERT OR UPDATE OR DELETE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_distributions
  AFTER INSERT OR UPDATE OR DELETE ON public.distributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
