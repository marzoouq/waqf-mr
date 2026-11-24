
CREATE OR REPLACE FUNCTION public.guard_self_share_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid()
     AND (TG_OP = 'INSERT'
          OR NEW.share_percentage IS DISTINCT FROM OLD.share_percentage
          OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'لا يجوز ربط سجل مستفيد بحسابك أو تعديل نسبة حصته';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND ((TG_OP = 'INSERT' AND COALESCE(NEW.share_percentage,0) <> 0)
          OR (TG_OP = 'UPDATE' AND NEW.share_percentage IS DISTINCT FROM OLD.share_percentage)) THEN
    RAISE EXCEPTION 'تعديل نسب الحصص مقصور على الناظر';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.approve_disbursement_voucher(p_voucher_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_created_by uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'ADMIN_ONLY'; END IF;
  SELECT created_by INTO v_created_by FROM public.disbursement_vouchers WHERE id = p_voucher_id;
  IF v_created_by = auth.uid() THEN
    RAISE EXCEPTION 'لا يجوز اعتماد سند صرف أنشأته بنفسك';
  END IF;
  UPDATE public.disbursement_vouchers
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_voucher_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND_OR_NOT_DRAFT'; END IF;
END $$;

-- التعديل المباشر عبر الواجهة البرمجية يجري بدور authenticated؛ الدوال الخادمية (التوزيع) تجري بصلاحية المالك
CREATE OR REPLACE FUNCTION public.guard_self_carryforward_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE v_ben uuid;
BEGIN
  v_ben := CASE WHEN TG_OP = 'DELETE' THEN OLD.beneficiary_id ELSE NEW.beneficiary_id END;
  IF auth.uid() IS NOT NULL
     AND current_user IN ('authenticated', 'anon')
     AND public.is_own_beneficiary(v_ben) THEN
    RAISE EXCEPTION 'لا يجوز تعديل ترحيل السُّلف الخاص بك';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.is_own_beneficiary(p_beneficiary_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = p_beneficiary_id AND b.user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_own_beneficiary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_beneficiary(uuid) TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_self_carryforward ON public.advance_carryforward;
CREATE TRIGGER trg_guard_self_carryforward BEFORE INSERT OR UPDATE OR DELETE ON public.advance_carryforward
  FOR EACH ROW EXECUTE FUNCTION public.guard_self_carryforward_change();

CREATE OR REPLACE FUNCTION public.guard_self_advance_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
          OR NEW.amount IS DISTINCT FROM OLD.amount)
     AND EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = NEW.beneficiary_id AND b.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'لا يجوز اعتماد أو تعديل سلفتك بنفسك';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_self_advance_status ON public.advance_requests;
CREATE TRIGGER trg_guard_self_advance_status BEFORE UPDATE ON public.advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_self_advance_status();

CREATE OR REPLACE FUNCTION public.guard_accountant_beneficiary_accounts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.user_id = auth.uid())
     AND (TG_OP = 'INSERT'
          OR NEW.waqf_revenue IS DISTINCT FROM OLD.waqf_revenue
          OR NEW.waqf_corpus_manual IS DISTINCT FROM OLD.waqf_corpus_manual) THEN
    RAISE EXCEPTION 'لا يجوز لمستفيد تعديل ريع الوقف أو رقبة الوقف';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_accountant_beneficiary_accounts ON public.accounts;
CREATE TRIGGER trg_guard_accountant_beneficiary_accounts BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_accountant_beneficiary_accounts();

CREATE UNIQUE INDEX IF NOT EXISTS distributions_account_beneficiary_uniq
  ON public.distributions (account_id, beneficiary_id);

REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_by_national_id(text) TO service_role;
