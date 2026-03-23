
-- التوصية 1: تغيير ON DELETE SET NULL إلى RESTRICT للأعمدة NOT NULL
-- هذا يعكس السلوك الفعلي بوضوح (SET NULL يفشل على NOT NULL = نفس RESTRICT)

-- income.fiscal_year_id
ALTER TABLE public.income
  DROP CONSTRAINT IF EXISTS income_fiscal_year_id_fkey,
  ADD CONSTRAINT income_fiscal_year_id_fkey
    FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id)
    ON DELETE RESTRICT;

-- expenses.fiscal_year_id
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_fiscal_year_id_fkey,
  ADD CONSTRAINT expenses_fiscal_year_id_fkey
    FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id)
    ON DELETE RESTRICT;

-- distributions.fiscal_year_id
ALTER TABLE public.distributions
  DROP CONSTRAINT IF EXISTS distributions_fiscal_year_id_fkey,
  ADD CONSTRAINT distributions_fiscal_year_id_fkey
    FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id)
    ON DELETE RESTRICT;

-- accounts.fiscal_year_id
ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_fiscal_year_id_fkey,
  ADD CONSTRAINT accounts_fiscal_year_id_fkey
    FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id)
    ON DELETE RESTRICT;

-- التوصية 2: إضافة validation trigger للـ polymorphic FK في invoice_chain و invoice_items

CREATE OR REPLACE FUNCTION public.validate_polymorphic_invoice_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_table = 'invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in invoices table', NEW.invoice_id;
    END IF;
  ELSIF NEW.source_table = 'payment_invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payment_invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in payment_invoices table', NEW.invoice_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid source_table value: %', NEW.source_table;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_polymorphic_invoice_item_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_source = 'invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in invoices table', NEW.invoice_id;
    END IF;
  ELSIF NEW.invoice_source = 'payment_invoices' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payment_invoices WHERE id = NEW.invoice_id) THEN
      RAISE EXCEPTION 'invoice_id % does not exist in payment_invoices table', NEW.invoice_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid invoice_source value: %', NEW.invoice_source;
  END IF;
  RETURN NEW;
END;
$$;

-- إنشاء المشغلات
DROP TRIGGER IF EXISTS trg_validate_invoice_chain_ref ON public.invoice_chain;
CREATE TRIGGER trg_validate_invoice_chain_ref
  BEFORE INSERT OR UPDATE ON public.invoice_chain
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_polymorphic_invoice_ref();

DROP TRIGGER IF EXISTS trg_validate_invoice_item_ref ON public.invoice_items;
CREATE TRIGGER trg_validate_invoice_item_ref
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_polymorphic_invoice_item_ref();
