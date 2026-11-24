CREATE OR REPLACE FUNCTION public.guard_self_share_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid()
     AND (TG_OP = 'INSERT'
          OR NEW.share_percentage IS DISTINCT FROM OLD.share_percentage
          OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'لا يجوز ربط سجل مستفيد بحسابك أو تعديل نسبة حصته';
  END IF;
  RETURN NEW;
END $function$;

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
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'طلب السلفة غير موجود'; END IF;
  -- تعارض مصالح: لا أحد (ناظراً أو محاسباً) يعتمد/يصرف سلفته
  IF EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = v_row.beneficiary_id AND b.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'لا يجوز تغيير حالة طلب سلفة يخصك';
  END IF;
  PERFORM public.assert_fiscal_year_open(v_row.fiscal_year_id);
  IF p_status = 'approved' THEN v_allowed_from := ARRAY['pending'];
  ELSIF p_status = 'rejected' THEN
    v_allowed_from := ARRAY['pending'];
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0 THEN RAISE EXCEPTION 'سبب الرفض مطلوب'; END IF;
  ELSIF p_status = 'paid' THEN v_allowed_from := ARRAY['approved'];
  ELSE RAISE EXCEPTION 'حالة غير صالحة: %', p_status;
  END IF;
  IF NOT (v_row.status = ANY(v_allowed_from)) THEN
    RAISE EXCEPTION 'لا يمكن الانتقال من % إلى %', v_row.status, p_status;
  END IF;
  UPDATE public.advance_requests SET
    status = p_status,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE rejection_reason END,
    approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_id;
  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_fiscal_year(p_fiscal_year_id uuid, p_account_data jsonb, p_waqf_corpus_manual numeric DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb; v_warnings jsonb:='[]'::jsonb; v_count integer;
  v_admin_pct numeric; v_waqif_pct numeric; v_base numeric;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'إقفال السنة للناظر فقط'; END IF;
 -- التحقق الخادمي من الحصص: تُعاد حسابها من النسب المعتمدة ولا تُقبل قيمة مخالفة
 SELECT COALESCE(NULLIF(value,'')::numeric,10) INTO v_admin_pct FROM public.app_settings WHERE key='admin_share_percentage';
 SELECT COALESCE(NULLIF(value,'')::numeric,5) INTO v_waqif_pct FROM public.app_settings WHERE key='waqif_share_percentage';
 v_admin_pct:=COALESCE(v_admin_pct,10); v_waqif_pct:=COALESCE(v_waqif_pct,5);
 v_base:=GREATEST(0, COALESCE((p_account_data->>'total_income')::numeric,0)
   - COALESCE((p_account_data->>'total_expenses')::numeric,0)
   - COALESCE((p_account_data->>'zakat_amount')::numeric,0));
 IF abs(COALESCE((p_account_data->>'admin_share')::numeric,0) - round(v_base*v_admin_pct/100,2)) > 0.01
    OR abs(COALESCE((p_account_data->>'waqif_share')::numeric,0) - round(v_base*v_waqif_pct/100,2)) > 0.01 THEN
   RAISE EXCEPTION 'حصة الناظر أو الواقف لا تطابق النسب المعتمدة';
 END IF;
 PERFORM pg_advisory_xact_lock(724601);
 SELECT count(*) INTO v_count FROM public.distributions WHERE fiscal_year_id=p_fiscal_year_id AND status='pending';
 IF v_count>0 THEN v_warnings:=v_warnings||jsonb_build_array('يوجد '||v_count||' توزيع بحالة معلقة'); END IF;
 SELECT count(*) INTO v_count FROM public.advance_requests WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','approved');
 IF v_count>0 THEN v_warnings:=v_warnings||jsonb_build_array('يوجد '||v_count||' طلب سلفة بحالة معلقة أو موافق عليها'); END IF;
 v_result:=public.close_fiscal_year_with_summary(p_fiscal_year_id,p_account_data,p_waqf_corpus_manual);
 IF COALESCE((v_result->>'carried_invoices')::integer,0)>0 THEN v_warnings:=v_warnings||v_result->'warnings'; END IF;
 RETURN jsonb_set(v_result,'{warnings}',v_warnings);
END; $function$;