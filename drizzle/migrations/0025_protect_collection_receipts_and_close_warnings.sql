ALTER FUNCTION public.close_fiscal_year(uuid,jsonb,numeric) RENAME TO close_fiscal_year_with_summary;
REVOKE ALL ON FUNCTION public.close_fiscal_year_with_summary(uuid,jsonb,numeric) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.close_fiscal_year(p_fiscal_year_id uuid,p_account_data jsonb,p_waqf_corpus_manual numeric DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb; v_warnings jsonb:='[]'::jsonb; v_count integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'إقفال السنة للناظر فقط'; END IF;
 PERFORM pg_advisory_xact_lock(724601);
 SELECT count(*) INTO v_count FROM public.distributions WHERE fiscal_year_id=p_fiscal_year_id AND status='pending';
 IF v_count>0 THEN v_warnings:=v_warnings||jsonb_build_array('يوجد '||v_count||' توزيع بحالة معلقة'); END IF;
 SELECT count(*) INTO v_count FROM public.advance_requests WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','approved');
 IF v_count>0 THEN v_warnings:=v_warnings||jsonb_build_array('يوجد '||v_count||' طلب سلفة بحالة معلقة أو موافق عليها'); END IF;
 v_result:=public.close_fiscal_year_with_summary(p_fiscal_year_id,p_account_data,p_waqf_corpus_manual);
 IF COALESCE((v_result->>'carried_invoices')::integer,0)>0 THEN v_warnings:=v_warnings||v_result->'warnings'; END IF;
 RETURN jsonb_set(v_result,'{warnings}',v_warnings);
END; $$;
REVOKE ALL ON FUNCTION public.close_fiscal_year(uuid,jsonb,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid,jsonb,numeric) TO authenticated;

ALTER FUNCTION public.pay_invoice_and_record_collection(uuid,numeric) RENAME TO pay_invoice_remaining_and_record_collection;
REVOKE ALL ON FUNCTION public.pay_invoice_remaining_and_record_collection(uuid,numeric) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.pay_invoice_and_record_collection(p_invoice_id uuid,p_paid_amount numeric DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_invoice public.payment_invoices; v_remaining numeric;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'accountant'::app_role) THEN RAISE EXCEPTION 'غير مصرح بتسديد الفواتير'; END IF;
 PERFORM pg_advisory_xact_lock(724601);
 SELECT * INTO v_invoice FROM public.payment_invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الفاتورة غير موجودة'; END IF;
 v_remaining:=GREATEST(v_invoice.amount-COALESCE(v_invoice.paid_amount,0),0);
 IF p_paid_amount IS NOT NULL AND p_paid_amount<>v_remaining THEN RAISE EXCEPTION 'السداد الجزئي غير متاح حتى إصدار سند مستقل لكل دفعة؛ أدخل كامل المتبقي'; END IF;
 RETURN public.pay_invoice_remaining_and_record_collection(p_invoice_id,p_paid_amount);
END; $$;
REVOKE ALL ON FUNCTION public.pay_invoice_and_record_collection(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid,numeric) TO authenticated;

ALTER FUNCTION public.unpay_invoice_and_revert_collection(uuid) RENAME TO unpay_invoice_collection_internal;
REVOKE ALL ON FUNCTION public.unpay_invoice_collection_internal(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.unpay_invoice_and_revert_collection(p_invoice_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'accountant'::app_role) THEN RAISE EXCEPTION 'غير مصرح بإلغاء التسديد'; END IF;
 PERFORM pg_advisory_xact_lock(724601);
 IF (SELECT count(*) FROM public.income WHERE payment_invoice_id=p_invoice_id)>1 THEN RAISE EXCEPTION 'توجد دفعات متعددة؛ لا يجوز إلغاء سجل التحصيل الكامل'; END IF;
 IF EXISTS(SELECT 1 FROM public.payment_invoices WHERE id=p_invoice_id AND status='partially_paid') THEN RAISE EXCEPTION 'السداد الجزئي السابق محفوظ ولا يُلغى جماعياً'; END IF;
 RETURN public.unpay_invoice_collection_internal(p_invoice_id);
END; $$;
REVOKE ALL ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) TO authenticated;

ALTER FUNCTION public.set_invoice_collectibility(uuid,boolean,text) RENAME TO set_invoice_collectibility_internal;
REVOKE ALL ON FUNCTION public.set_invoice_collectibility_internal(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.set_invoice_collectibility(p_invoice_id uuid,p_uncollectible boolean,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'تصنيف التحصيل للناظر فقط'; END IF;
 PERFORM pg_advisory_xact_lock(724601);
 PERFORM public.set_invoice_collectibility_internal(p_invoice_id,p_uncollectible,p_reason);
END; $$;
REVOKE ALL ON FUNCTION public.set_invoice_collectibility(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_invoice_collectibility(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_invoice_collection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status text;
BEGIN
 IF NEW.collection_status NOT IN ('collectible','uncollectible') THEN RAISE EXCEPTION 'حالة التحصيل غير صحيحة'; END IF;
 IF TG_OP='UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.paid_amount IS DISTINCT FROM NEW.paid_amount OR OLD.paid_date IS DISTINCT FROM NEW.paid_date OR OLD.collection_status IS DISTINCT FROM NEW.collection_status OR OLD.collection_reason IS DISTINCT FROM NEW.collection_reason) THEN
  SELECT status INTO v_status FROM public.fiscal_years WHERE id=OLD.fiscal_year_id FOR SHARE;
  IF v_status IS NULL OR v_status='closed' THEN RAISE EXCEPTION 'لا يمكن التحصيل أو التراجع في سنة مقفلة'; END IF;
  IF OLD.collection_status IS DISTINCT FROM NEW.collection_status OR OLD.collection_reason IS DISTINCT FROM NEW.collection_reason THEN
   IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'تصنيف التحصيل للناظر فقط'; END IF;
   IF length(trim(COALESCE(NEW.collection_reason,'')))<3 THEN RAISE EXCEPTION 'سبب تعذر التحصيل مطلوب'; END IF;
  END IF;
  IF NEW.collection_status='uncollectible' AND NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN RAISE EXCEPTION 'الفاتورة غير قابلة للتحصيل'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_invoice_collection() FROM PUBLIC,anon,authenticated;