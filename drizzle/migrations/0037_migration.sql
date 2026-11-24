REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

DROP POLICY IF EXISTS "Accountants manage disbursement_vouchers" ON public.disbursement_vouchers;
CREATE POLICY "Accountants manage draft disbursement_vouchers" ON public.disbursement_vouchers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role) AND status = 'draft'::voucher_status)
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role) AND status = 'draft'::voucher_status AND approved_by IS NULL AND approved_at IS NULL);

DROP POLICY IF EXISTS "Accountants can manage annual_report_status" ON public.annual_report_status;
CREATE POLICY "Accountants can manage unpublished annual_report_status" ON public.annual_report_status
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role) AND status <> 'published')
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role) AND status <> 'published' AND published_at IS NULL);

DROP POLICY IF EXISTS "Admins can manage distributions" ON public.distributions;
CREATE POLICY "Admins can manage distributions" ON public.distributions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND NOT EXISTS (
    SELECT 1 FROM public.beneficiaries b WHERE b.id = distributions.beneficiary_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_self_share_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.share_percentage IS DISTINCT FROM OLD.share_percentage)
     AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يجوز تعديل نسبة الحصة في سجل مستفيد مرتبط بحسابك';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_self_share_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_self_share_change ON public.beneficiaries;
CREATE TRIGGER trg_guard_self_share_change BEFORE INSERT OR UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.guard_self_share_change();

DROP POLICY IF EXISTS "Accountants can manage advance_requests" ON public.advance_requests;
CREATE POLICY "Accountants can manage advance_requests" ON public.advance_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role) AND NOT EXISTS (
    SELECT 1 FROM public.beneficiaries b WHERE b.id = advance_requests.beneficiary_id AND b.user_id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role) AND NOT EXISTS (
    SELECT 1 FROM public.beneficiaries b WHERE b.id = advance_requests.beneficiary_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "Only admins and accountants can update advance_requests" ON public.advance_requests;
CREATE POLICY "Only admins and accountants can update advance_requests" ON public.advance_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'accountant'::app_role) AND NOT EXISTS (
    SELECT 1 FROM public.beneficiaries b WHERE b.id = advance_requests.beneficiary_id AND b.user_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.update_advance_status(p_id uuid, p_status text, p_rejection_reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.advance_requests%ROWTYPE;
  v_allowed_from text[];
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح بتغيير حالة طلب السلفة';
  END IF;

  SELECT * INTO v_row FROM public.advance_requests WHERE id = p_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'طلب السلفة غير موجود';
  END IF;

  -- تعارض مصالح: المحاسب لا يعتمد/يصرف سلفته
  IF NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = v_row.beneficiary_id AND b.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'لا يجوز تغيير حالة طلب سلفة يخصك';
  END IF;

  PERFORM public.assert_fiscal_year_open(v_row.fiscal_year_id);

  IF p_status = 'approved' THEN
    v_allowed_from := ARRAY['pending'];
  ELSIF p_status = 'rejected' THEN
    v_allowed_from := ARRAY['pending'];
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0 THEN
      RAISE EXCEPTION 'سبب الرفض مطلوب';
    END IF;
  ELSIF p_status = 'paid' THEN
    v_allowed_from := ARRAY['approved'];
  ELSE
    RAISE EXCEPTION 'حالة غير صالحة: %', p_status;
  END IF;

  IF NOT (v_row.status = ANY(v_allowed_from)) THEN
    RAISE EXCEPTION 'لا يمكن الانتقال من % إلى %', v_row.status, p_status;
  END IF;

  UPDATE public.advance_requests
  SET
    status = p_status,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE rejection_reason END,
    approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.update_advance_status(uuid, text, text) FROM PUBLIC, anon;