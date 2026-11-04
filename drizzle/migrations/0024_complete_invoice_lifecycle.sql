ALTER TABLE public.payment_invoices ADD COLUMN IF NOT EXISTS collection_status text NOT NULL DEFAULT 'collectible';
ALTER TABLE public.payment_invoices ADD COLUMN IF NOT EXISTS collection_reason text;
ALTER TABLE public.payment_invoices ADD COLUMN IF NOT EXISTS collection_changed_by uuid;
ALTER TABLE public.payment_invoices ADD COLUMN IF NOT EXISTS collection_changed_at timestamptz;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS payment_invoice_id uuid REFERENCES public.payment_invoices(id);

CREATE TABLE public.invoice_carry_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.payment_invoices(id),
 from_fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id), to_fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id),
 outstanding_amount numeric NOT NULL, was_overdue boolean NOT NULL, carried_at timestamptz NOT NULL DEFAULT now(), carried_by uuid
);
GRANT SELECT ON public.invoice_carry_events TO authenticated;
GRANT ALL ON public.invoice_carry_events TO service_role;
ALTER TABLE public.invoice_carry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read carry history" ON public.invoice_carry_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role));

CREATE TABLE public.fiscal_closure_summaries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id),
 next_fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id), overdue_count integer NOT NULL, overdue_amount numeric NOT NULL,
 upcoming_count integer NOT NULL, upcoming_amount numeric NOT NULL, closed_at timestamptz NOT NULL DEFAULT now(), closed_by uuid
);
GRANT SELECT ON public.fiscal_closure_summaries TO authenticated;
GRANT ALL ON public.fiscal_closure_summaries TO service_role;
ALTER TABLE public.fiscal_closure_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessible closure summaries" ON public.fiscal_closure_summaries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role) OR (public.is_fiscal_year_accessible(fiscal_year_id) AND (public.has_role(auth.uid(),'beneficiary'::app_role) OR public.has_role(auth.uid(),'waqif'::app_role))));
CREATE INDEX fiscal_closure_latest ON public.fiscal_closure_summaries(fiscal_year_id,closed_at DESC);
CREATE TRIGGER audit_carry_events AFTER INSERT ON public.invoice_carry_events FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_closure_summaries AFTER INSERT ON public.fiscal_closure_summaries FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE FUNCTION public.guard_invoice_collection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status text;
BEGIN
 IF NEW.collection_status NOT IN ('collectible','uncollectible') THEN RAISE EXCEPTION 'حالة التحصيل غير صحيحة'; END IF;
 IF TG_OP='UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.paid_amount IS DISTINCT FROM NEW.paid_amount OR OLD.collection_status IS DISTINCT FROM NEW.collection_status) THEN
  SELECT status INTO v_status FROM public.fiscal_years WHERE id=OLD.fiscal_year_id FOR SHARE;
  IF v_status IS NULL OR v_status='closed' THEN RAISE EXCEPTION 'لا يمكن التحصيل أو التراجع في سنة مقفلة'; END IF;
  IF OLD.collection_status IS DISTINCT FROM NEW.collection_status THEN
   IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'تصنيف التحصيل للناظر فقط'; END IF;
   IF length(trim(COALESCE(NEW.collection_reason,'')))<3 THEN RAISE EXCEPTION 'سبب تعذر التحصيل مطلوب'; END IF;
  END IF;
  IF NEW.collection_status='uncollectible' AND NEW.paid_amount IS DISTINCT FROM OLD.paid_amount THEN RAISE EXCEPTION 'الفاتورة غير قابلة للتحصيل'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_invoice_collection BEFORE INSERT OR UPDATE ON public.payment_invoices FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_collection();
REVOKE ALL ON FUNCTION public.guard_invoice_collection() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_invoice_collectibility(p_invoice_id uuid,p_uncollectible boolean,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_invoice public.payment_invoices;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'تصنيف التحصيل للناظر فقط'; END IF;
 IF length(trim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'سبب تعذر التحصيل مطلوب'; END IF;
 SELECT * INTO v_invoice FROM public.payment_invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الفاتورة غير موجودة'; END IF;
 IF v_invoice.status='paid' THEN RAISE EXCEPTION 'لا يمكن تصنيف فاتورة مسددة'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.fiscal_years WHERE id=v_invoice.fiscal_year_id AND status='active') THEN RAISE EXCEPTION 'لا يمكن تغيير سنة مقفلة'; END IF;
 UPDATE public.payment_invoices SET collection_status=CASE WHEN p_uncollectible THEN 'uncollectible' ELSE 'collectible' END,collection_reason=trim(p_reason),collection_changed_by=auth.uid(),collection_changed_at=now() WHERE id=p_invoice_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_invoice_collectibility(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_invoice_collectibility(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_fiscal_year(p_fiscal_year_id uuid,p_account_data jsonb,p_waqf_corpus_manual numeric DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_fy public.fiscal_years; v_account_id uuid; v_next_id uuid; v_next_status text; v_next_label text; v_next_start date; v_next_end date; v_count int; v_overdue int; v_overdue_amount numeric; v_upcoming int; v_upcoming_amount numeric; v_total_income numeric; v_distributions numeric; v_cid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'فقط الناظر يملك صلاحية إقفال السنة المالية'; END IF;
 SELECT * INTO v_fy FROM public.fiscal_years WHERE id=p_fiscal_year_id FOR UPDATE;
 IF NOT FOUND OR v_fy.status<>'active' THEN RAISE EXCEPTION 'السنة غير نشطة أو مقفلة بالفعل'; END IF;
 v_total_income:=COALESCE((p_account_data->>'total_income')::numeric,0);
 IF v_total_income<=0 AND COALESCE((p_account_data->>'total_expenses')::numeric,0)<=0 THEN RAISE EXCEPTION 'لا يمكن إقفال السنة المالية بحسابات ختامية صفرية'; END IF;
 v_next_start:=v_fy.end_date+1; v_next_end:=(v_next_start+interval '1 year'-interval '1 day')::date;
 v_next_label:=extract(year from v_next_start)::text||'-'||extract(year from v_next_end)::text;
 SELECT id,status INTO v_next_id,v_next_status FROM public.fiscal_years WHERE start_date=v_next_start FOR UPDATE;
 IF v_next_status = 'closed' AND EXISTS(SELECT 1 FROM public.payment_invoices WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','overdue','partially_paid') AND collection_status <> 'uncollectible') THEN RAISE EXCEPTION 'لا يمكن ترحيل فواتير إلى سنة لاحقة مقفلة'; END IF;
 PERFORM id FROM public.payment_invoices WHERE fiscal_year_id=p_fiscal_year_id FOR UPDATE;
 SELECT count(*) FILTER(WHERE due_date<=v_fy.end_date),COALESCE(sum(GREATEST(amount-COALESCE(paid_amount,0),0)) FILTER(WHERE due_date<=v_fy.end_date),0),count(*) FILTER(WHERE due_date>v_fy.end_date),COALESCE(sum(GREATEST(amount-COALESCE(paid_amount,0),0)) FILTER(WHERE due_date>v_fy.end_date),0)
 INTO v_overdue,v_overdue_amount,v_upcoming,v_upcoming_amount FROM public.payment_invoices WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','overdue','partially_paid') AND collection_status <> 'uncollectible';
 SELECT COALESCE(sum(amount),0) INTO v_distributions FROM public.distributions WHERE fiscal_year_id=p_fiscal_year_id AND status<>'cancelled';
 SELECT id INTO v_account_id FROM public.accounts WHERE fiscal_year_id=p_fiscal_year_id;
 IF v_account_id IS NULL THEN
  INSERT INTO public.accounts(fiscal_year,fiscal_year_id,total_income,total_expenses,admin_share,waqif_share,waqf_revenue,vat_amount,distributions_amount,net_after_expenses,net_after_vat,zakat_amount,waqf_corpus_manual,waqf_corpus_previous)
  VALUES(v_fy.label,p_fiscal_year_id,v_total_income,COALESCE((p_account_data->>'total_expenses')::numeric,0),COALESCE((p_account_data->>'admin_share')::numeric,0),COALESCE((p_account_data->>'waqif_share')::numeric,0),COALESCE((p_account_data->>'waqf_revenue')::numeric,0),COALESCE((p_account_data->>'vat_amount')::numeric,0),v_distributions,COALESCE((p_account_data->>'net_after_expenses')::numeric,0),COALESCE((p_account_data->>'net_after_vat')::numeric,0),COALESCE((p_account_data->>'zakat_amount')::numeric,0),p_waqf_corpus_manual,COALESCE((p_account_data->>'waqf_corpus_previous')::numeric,0)) RETURNING id INTO v_account_id;
 ELSE
  UPDATE public.accounts SET total_income=v_total_income,total_expenses=COALESCE((p_account_data->>'total_expenses')::numeric,0),admin_share=COALESCE((p_account_data->>'admin_share')::numeric,0),waqif_share=COALESCE((p_account_data->>'waqif_share')::numeric,0),waqf_revenue=COALESCE((p_account_data->>'waqf_revenue')::numeric,0),vat_amount=COALESCE((p_account_data->>'vat_amount')::numeric,0),distributions_amount=v_distributions,net_after_expenses=COALESCE((p_account_data->>'net_after_expenses')::numeric,0),net_after_vat=COALESCE((p_account_data->>'net_after_vat')::numeric,0),zakat_amount=COALESCE((p_account_data->>'zakat_amount')::numeric,0),waqf_corpus_manual=p_waqf_corpus_manual,waqf_corpus_previous=COALESCE((p_account_data->>'waqf_corpus_previous')::numeric,0),updated_at=now() WHERE id=v_account_id;
 END IF;
 UPDATE public.fiscal_years SET status='closed' WHERE id=p_fiscal_year_id;
 IF v_next_id IS NULL THEN INSERT INTO public.fiscal_years(label,start_date,end_date,status,published) VALUES(v_next_label,v_next_start,v_next_end,'active',false) RETURNING id INTO v_next_id; END IF;
 INSERT INTO public.fiscal_closure_summaries(fiscal_year_id,next_fiscal_year_id,overdue_count,overdue_amount,upcoming_count,upcoming_amount,closed_by) VALUES(p_fiscal_year_id,v_next_id,v_overdue,v_overdue_amount,v_upcoming,v_upcoming_amount,auth.uid());
 INSERT INTO public.invoice_carry_events(invoice_id,from_fiscal_year_id,to_fiscal_year_id,outstanding_amount,was_overdue,carried_by)
 SELECT id,p_fiscal_year_id,v_next_id,GREATEST(amount-COALESCE(paid_amount,0),0),due_date<=v_fy.end_date,auth.uid() FROM public.payment_invoices WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','overdue','partially_paid') AND collection_status <> 'uncollectible';
 UPDATE public.payment_invoices SET origin_fiscal_year_id=COALESCE(origin_fiscal_year_id,CASE WHEN due_date<=v_fy.end_date THEN p_fiscal_year_id END),fiscal_year_id=v_next_id,updated_at=now() WHERE fiscal_year_id=p_fiscal_year_id AND status IN ('pending','overdue','partially_paid') AND collection_status <> 'uncollectible';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 FOR v_cid IN SELECT DISTINCT contract_id FROM public.payment_invoices WHERE fiscal_year_id=v_next_id LOOP PERFORM public.recompute_contract_allocations(v_cid); END LOOP;
 IF v_overdue>0 THEN PERFORM public.notify_ops('متأخرات مرحّلة من '||v_fy.label,'رُحلت '||v_overdue||' فاتورة بمبلغ '||v_overdue_amount||' ريال','warning','/dashboard/invoices'); END IF;
 RETURN jsonb_build_object('success',true,'account_id',v_account_id,'closed_label',v_fy.label,'next_label',v_next_label,'carried_invoices',v_count,'carried_overdue',v_overdue,'carried_overdue_amount',v_overdue_amount,'distributions_amount',v_distributions,'warnings',jsonb_build_array('تم ترحيل '||v_count||' فاتورة غير مسددة'));
END; $$;
REVOKE ALL ON FUNCTION public.close_fiscal_year(uuid,jsonb,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid,jsonb,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_invoice_and_record_collection(p_invoice_id uuid,p_paid_amount numeric DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_invoice public.payment_invoices; v_contract public.contracts; v_amount numeric; v_remaining numeric; v_paid numeric; v_complete boolean; v_date date; v_year public.fiscal_years;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'accountant'::app_role) THEN RAISE EXCEPTION 'غير مصرح بتسديد الفواتير'; END IF;
 SELECT * INTO v_invoice FROM public.payment_invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الفاتورة غير موجودة'; END IF;
 IF v_invoice.status='paid' THEN RAISE EXCEPTION 'الفاتورة مسددة بالفعل'; END IF;
 IF v_invoice.collection_status='uncollectible' THEN RAISE EXCEPTION 'الفاتورة غير قابلة للتحصيل'; END IF;
 SELECT * INTO v_year FROM public.fiscal_years WHERE id=v_invoice.fiscal_year_id FOR SHARE;
 IF NOT FOUND OR v_year.status<>'active' THEN RAISE EXCEPTION 'لا يمكن التحصيل أو التراجع في سنة مقفلة'; END IF;
 SELECT * INTO v_contract FROM public.contracts WHERE id=v_invoice.contract_id;
 v_remaining:=GREATEST(v_invoice.amount-COALESCE(v_invoice.paid_amount,0),0);
 v_amount:=COALESCE(p_paid_amount,v_remaining);
 IF v_amount<=0 OR v_amount>v_remaining OR v_amount<>round(v_amount,2) THEN RAISE EXCEPTION 'مبلغ السداد يجب أن يكون موجباً ولا يتجاوز المتبقي'; END IF;
 v_paid:=COALESCE(v_invoice.paid_amount,0)+v_amount; v_complete:=v_paid>=v_invoice.amount;
 v_date:=CASE WHEN v_invoice.origin_fiscal_year_id IS NOT NULL THEN (now() AT TIME ZONE 'Asia/Riyadh')::date ELSE v_invoice.due_date END;
 IF v_date<v_year.start_date OR v_date>v_year.end_date THEN RAISE EXCEPTION 'تاريخ التحصيل خارج السنة المفتوحة المختارة'; END IF;
 UPDATE public.payment_invoices SET status=CASE WHEN v_complete THEN 'paid' ELSE 'partially_paid' END,paid_date=(now() AT TIME ZONE 'Asia/Riyadh')::date,paid_amount=v_paid,updated_at=now() WHERE id=p_invoice_id;
 IF v_complete THEN
  INSERT INTO public.tenant_payments(contract_id,paid_months,notes) VALUES(v_invoice.contract_id,1,'تحصيل فاتورة '||v_invoice.invoice_number) ON CONFLICT(contract_id) DO UPDATE SET paid_months=tenant_payments.paid_months+1,updated_at=now();
 END IF;
 INSERT INTO public.income(source,amount,date,property_id,contract_id,fiscal_year_id,notes,payment_invoice_id) VALUES('إيجار - '||v_contract.tenant_name,v_amount,v_date,v_contract.property_id,v_contract.id,v_invoice.fiscal_year_id,'تحصيل تلقائي - فاتورة '||v_invoice.invoice_number||CASE WHEN v_invoice.origin_fiscal_year_id IS NOT NULL THEN ' - متأخرات مرحّلة من سنة سابقة' ELSE '' END,p_invoice_id);
 RETURN jsonb_build_object('success',true,'invoice_number',v_invoice.invoice_number,'paid_amount',v_amount,'remaining_amount',v_remaining-v_amount,'status',CASE WHEN v_complete THEN 'paid' ELSE 'partially_paid' END);
END; $$;
REVOKE ALL ON FUNCTION public.pay_invoice_and_record_collection(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.unpay_invoice_and_revert_collection(p_invoice_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_invoice public.payment_invoices; v_deleted int;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'accountant'::app_role) THEN RAISE EXCEPTION 'غير مصرح بإلغاء التسديد'; END IF;
 SELECT * INTO v_invoice FROM public.payment_invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND OR v_invoice.status NOT IN ('paid','partially_paid') THEN RAISE EXCEPTION 'الفاتورة ليست مسددة'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.fiscal_years WHERE id=v_invoice.fiscal_year_id AND status='active') THEN RAISE EXCEPTION 'لا يمكن التحصيل أو التراجع في سنة مقفلة'; END IF;
 IF EXISTS(SELECT 1 FROM public.income WHERE payment_invoice_id=p_invoice_id AND fiscal_year_id<>v_invoice.fiscal_year_id) THEN RAISE EXCEPTION 'توجد تحصيلات في سنة سابقة؛ لا يجوز التراجع عنها من السنة الحالية'; END IF;
 IF EXISTS(SELECT 1 FROM public.invoice_carry_events WHERE invoice_id=p_invoice_id AND outstanding_amount<v_invoice.amount) THEN RAISE EXCEPTION 'السداد الجزئي السابق محفوظ؛ لا يجوز إلغاؤه بعد الترحيل'; END IF;
 DELETE FROM public.income WHERE fiscal_year_id=v_invoice.fiscal_year_id AND (payment_invoice_id=p_invoice_id OR (payment_invoice_id IS NULL AND contract_id=v_invoice.contract_id AND notes LIKE '%فاتورة '||v_invoice.invoice_number||' - الدفعة رقم %'));
 GET DIAGNOSTICS v_deleted=ROW_COUNT;
 IF v_invoice.status='paid' THEN UPDATE public.tenant_payments SET paid_months=GREATEST(paid_months-1,0),updated_at=now() WHERE contract_id=v_invoice.contract_id; END IF;
 UPDATE public.payment_invoices SET status=CASE WHEN due_date<(now() AT TIME ZONE 'Asia/Riyadh')::date THEN 'overdue' ELSE 'pending' END,paid_date=NULL,paid_amount=0,updated_at=now() WHERE id=p_invoice_id;
 RETURN jsonb_build_object('success',true,'income_deleted',v_deleted);
END; $$;
REVOKE ALL ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) TO authenticated;