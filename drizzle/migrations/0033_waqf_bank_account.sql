-- الحساب البنكي للوقف: صف واحد، يديره الناظر، ويطّلع عليه المحاسب، والمستفيد بإذن الناظر فقط
CREATE TABLE public.waqf_bank_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  bank_name text NOT NULL DEFAULT '',
  account_holder text NOT NULL DEFAULT '',
  account_number text,
  iban text,
  recorded_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (recorded_balance >= 0),
  balance_as_of date,
  balance_source text NOT NULL DEFAULT 'manual' CHECK (balance_source IN ('manual','corpus_carryforward')),
  source_fiscal_year_id uuid REFERENCES public.fiscal_years(id),
  notes text,
  visible_to_beneficiaries boolean NOT NULL DEFAULT false,
  statement_visible_to_beneficiaries boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.waqf_bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  statement_date date,
  notes text,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX waqf_bank_statements_one_current ON public.waqf_bank_statements (is_current) WHERE is_current;

CREATE TABLE public.waqf_bank_balance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_balance numeric(14,2),
  new_balance numeric(14,2) NOT NULL,
  source text NOT NULL,
  fiscal_year_id uuid REFERENCES public.fiscal_years(id),
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.waqf_bank_account TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waqf_bank_statements TO authenticated;
GRANT SELECT ON public.waqf_bank_balance_log TO authenticated;
GRANT ALL ON public.waqf_bank_account, public.waqf_bank_statements, public.waqf_bank_balance_log TO service_role;

ALTER TABLE public.waqf_bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waqf_bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waqf_bank_balance_log ENABLE ROW LEVEL SECURITY;

-- قرار الإظهار للمستفيد والواقف (fail-closed: لا صف = لا إظهار)
CREATE OR REPLACE FUNCTION public.bank_section_visible(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (public.has_role(_user_id, 'beneficiary'::app_role) OR public.has_role(_user_id, 'waqif'::app_role))
     AND COALESCE((SELECT a.visible_to_beneficiaries FROM public.waqf_bank_account a LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.bank_statement_visible(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.bank_section_visible(_user_id)
     AND COALESCE((SELECT a.statement_visible_to_beneficiaries FROM public.waqf_bank_account a LIMIT 1), false);
$$;
REVOKE ALL ON FUNCTION public.bank_section_visible(uuid), public.bank_statement_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bank_section_visible(uuid), public.bank_statement_visible(uuid) TO authenticated;

CREATE POLICY bank_account_select ON public.waqf_bank_account FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)
         OR public.bank_section_visible(auth.uid()));
CREATE POLICY bank_account_admin_insert ON public.waqf_bank_account FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY bank_account_admin_update ON public.waqf_bank_account FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY bank_statements_select ON public.waqf_bank_statements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)
         OR (is_current AND public.bank_statement_visible(auth.uid())));
CREATE POLICY bank_statements_admin_insert ON public.waqf_bank_statements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY bank_statements_admin_update ON public.waqf_bank_statements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY bank_statements_admin_delete ON public.waqf_bank_statements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY bank_balance_log_select ON public.waqf_bank_balance_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)
         OR public.bank_section_visible(auth.uid()));

-- ختم وقت التعديل ومنفّذه
CREATE OR REPLACE FUNCTION public.waqf_bank_account_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END $$;
CREATE TRIGGER waqf_bank_account_touch BEFORE INSERT OR UPDATE ON public.waqf_bank_account
  FOR EACH ROW EXECUTE FUNCTION public.waqf_bank_account_touch();

-- سجل الرصيد: كل تغيّر في الرصيد يُسجَّل ولا يُعدَّل
CREATE OR REPLACE FUNCTION public.waqf_bank_balance_logger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.recorded_balance IS DISTINCT FROM OLD.recorded_balance THEN
    INSERT INTO public.waqf_bank_balance_log (previous_balance, new_balance, source, fiscal_year_id, note, changed_by)
    VALUES (CASE WHEN TG_OP = 'UPDATE' THEN OLD.recorded_balance END, NEW.recorded_balance,
            NEW.balance_source, NEW.source_fiscal_year_id, NEW.notes, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER waqf_bank_balance_logger AFTER INSERT OR UPDATE ON public.waqf_bank_account
  FOR EACH ROW EXECUTE FUNCTION public.waqf_bank_balance_logger();

-- عند إقفال السنة: رصد رقبة الوقف لتلك السنة كرصيد للحساب البنكي.
-- يكتب في جدول الحساب البنكي فقط، ولا يوقف الإقفال إن تعذّر.
CREATE OR REPLACE FUNCTION public.record_corpus_in_bank_on_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_corpus numeric;
BEGIN
  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    BEGIN
      SELECT a.waqf_corpus_manual INTO v_corpus FROM public.accounts a WHERE a.fiscal_year_id = NEW.id LIMIT 1;
      IF v_corpus IS NOT NULL AND v_corpus >= 0 THEN
        INSERT INTO public.waqf_bank_account (recorded_balance, balance_as_of, balance_source, source_fiscal_year_id, notes)
        VALUES (v_corpus, NEW.end_date, 'corpus_carryforward', NEW.id, 'رقبة الوقف المرحّلة من السنة ' || NEW.label)
        ON CONFLICT (singleton) DO UPDATE SET
          recorded_balance = EXCLUDED.recorded_balance, balance_as_of = EXCLUDED.balance_as_of,
          balance_source = EXCLUDED.balance_source, source_fiscal_year_id = EXCLUDED.source_fiscal_year_id,
          notes = EXCLUDED.notes;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'record_corpus_in_bank_on_close skipped: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_corpus_in_bank_on_close AFTER UPDATE OF status ON public.fiscal_years
  FOR EACH ROW EXECUTE FUNCTION public.record_corpus_in_bank_on_close();

-- سجل المراجعة
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['waqf_bank_account','waqf_bank_statements'] LOOP
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()', t);
  END LOOP;
END $$;

-- رصد مبدئي: رقبة الوقف لآخر سنة مقفلة، والقسم مخفي افتراضياً
INSERT INTO public.waqf_bank_account (recorded_balance, balance_as_of, balance_source, source_fiscal_year_id, notes)
SELECT a.waqf_corpus_manual, f.end_date, 'corpus_carryforward', f.id, 'رقبة الوقف المرحّلة من السنة ' || f.label
FROM public.fiscal_years f JOIN public.accounts a ON a.fiscal_year_id = f.id
WHERE f.status = 'closed' AND a.waqf_corpus_manual >= 0
ORDER BY f.end_date DESC LIMIT 1
ON CONFLICT (singleton) DO NOTHING;

-- صلاحيات مخزن الكشوف (المحاسب اطلاع فقط، المستفيد والواقف بشرط إذن الناظر في can_access_file)
INSERT INTO public.file_access_rules (bucket_id, role, can_read, can_download, can_upload, can_delete) VALUES
  ('waqf-bank-statements','accountant', true, true, false, false),
  ('waqf-bank-statements','beneficiary', true, true, false, false),
  ('waqf-bank-statements','waqif', true, true, false, false)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_file(_user_id uuid, _bucket text, _path text, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g text;
  allowed boolean := false;
  doc_cat text;
BEGIN
  IF _user_id IS NULL OR _action NOT IN ('read','download','upload','delete') THEN RETURN false; END IF;
  IF _user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(),'') <> 'service_role' THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  SELECT effect INTO g FROM public.file_access_grants
   WHERE bucket_id = _bucket AND object_path = _path AND user_id = _user_id
     AND (expires_at IS NULL OR expires_at > now());
  IF g = 'deny' THEN RETURN false; END IF;
  IF g = 'allow' AND _action IN ('read','download') THEN RETURN true; END IF;

  IF _bucket = 'waqf-documents' THEN
    SELECT d.category INTO doc_cat FROM public.archived_documents d WHERE d.storage_path = _path LIMIT 1;
  END IF;

  IF doc_cat IS NOT NULL THEN
    -- قاعدة الفئة تُقدَّم على قاعدة الحاوية
    SELECT bool_or(CASE _action WHEN 'read' THEN r.can_read WHEN 'download' THEN r.can_download
                   WHEN 'upload' THEN r.can_upload ELSE r.can_delete END)
      INTO allowed
      FROM public.file_category_rules r JOIN public.user_roles ur ON ur.role = r.role
     WHERE ur.user_id = _user_id AND r.bucket_id = _bucket AND r.category = doc_cat;
  ELSE
    SELECT bool_or(CASE _action WHEN 'read' THEN r.can_read WHEN 'download' THEN r.can_download
                   WHEN 'upload' THEN r.can_upload ELSE r.can_delete END)
      INTO allowed
      FROM public.file_access_rules r JOIN public.user_roles ur ON ur.role = r.role
     WHERE ur.user_id = _user_id AND r.bucket_id = _bucket;
  END IF;
  IF NOT COALESCE(allowed,false) THEN RETURN false; END IF;

  IF public.has_role(_user_id, 'accountant'::app_role) THEN RETURN true; END IF;
  IF _bucket = 'disbursement-vouchers' THEN
    RETURN EXISTS (SELECT 1 FROM public.disbursement_vouchers v WHERE v.pdf_path = _path
                   AND v.status = 'approved'::voucher_status AND public.is_fiscal_year_accessible(v.fiscal_year_id));
  ELSIF _bucket = 'waqf-documents' THEN
    RETURN EXISTS (SELECT 1 FROM public.archived_documents d WHERE d.storage_path = _path AND d.is_published);
  ELSIF _bucket = 'invoices' THEN
    RETURN EXISTS (SELECT 1 FROM public.invoices i JOIN public.fiscal_years f ON f.id = i.fiscal_year_id
                    WHERE i.file_path = _path AND f.published)
        OR EXISTS (SELECT 1 FROM public.payment_invoices p JOIN public.fiscal_years f ON f.id = p.fiscal_year_id
                    WHERE p.file_path = _path AND f.published);
  ELSIF _bucket = 'waqf-bank-statements' THEN
    -- الكشف الحالي فقط، وبإذن الناظر لإظهار القسم والكشف معاً
    RETURN _action IN ('read','download') AND public.bank_statement_visible(_user_id)
       AND EXISTS (SELECT 1 FROM public.waqf_bank_statements s WHERE s.storage_path = _path AND s.is_current);
  END IF;
  RETURN false;
END $function$;

CREATE POLICY "fac_select_bank_statements" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'waqf-bank-statements' AND public.can_access_file(auth.uid(), bucket_id, name, 'read'));
CREATE POLICY "fac_insert_bank_statements" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'waqf-bank-statements' AND public.can_access_file(auth.uid(), bucket_id, name, 'upload'));
CREATE POLICY "fac_delete_bank_statements" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'waqf-bank-statements' AND public.can_access_file(auth.uid(), bucket_id, name, 'delete'));