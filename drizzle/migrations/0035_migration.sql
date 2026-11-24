-- حد المحاولات: المستدعون المباشرون لا يلمسون إلا مفاتيح البحث العام
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  IF session_user IN ('anon','authenticated') OR current_user IN ('anon','authenticated') THEN
    IF current_user IN ('anon','authenticated') AND p_key NOT LIKE 'lookup_nid:%' THEN
      RAISE EXCEPTION 'forbidden rate limit key' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1;
    SELECT count INTO v_count FROM rate_limits WHERE key = p_key;
    RETURN COALESCE(v_count, 1) > p_limit;
  END IF;

  IF v_window_start < now() - (p_window_seconds || ' seconds')::interval THEN
    UPDATE rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN false;
  END IF;

  UPDATE rate_limits SET count = v_count + 1 WHERE key = p_key;
  RETURN (v_count + 1) > p_limit;
END;
$function$;

-- ظهور قسم البنك: لا يُستعلم عن مستخدم آخر
CREATE OR REPLACE FUNCTION public.bank_section_visible(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid()
     AND (public.has_role(_user_id, 'beneficiary'::app_role) OR public.has_role(_user_id, 'waqif'::app_role))
     AND COALESCE((SELECT a.visible_to_beneficiaries FROM public.waqf_bank_account a LIMIT 1), false);
$function$;

-- المحاسب لا يدير سجلات مرتبطة بحسابه كمستفيد
DROP POLICY IF EXISTS "Accountants can manage beneficiaries" ON public.beneficiaries;
CREATE POLICY "Accountants can manage beneficiaries" ON public.beneficiaries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'accountant'::app_role) AND user_id IS DISTINCT FROM auth.uid())
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role) AND user_id IS DISTINCT FROM auth.uid());

DROP POLICY IF EXISTS "Accountants can manage distributions" ON public.distributions;
CREATE POLICY "Accountants can manage distributions" ON public.distributions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'accountant'::app_role)
  AND NOT EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = beneficiary_id AND b.user_id = auth.uid()))
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role)
  AND status <> 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = beneficiary_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "Accountants can manage advance_carryforward" ON public.advance_carryforward;
CREATE POLICY "Accountants can manage advance_carryforward" ON public.advance_carryforward FOR ALL TO authenticated
USING (has_role(auth.uid(), 'accountant'::app_role)
  AND NOT EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = beneficiary_id AND b.user_id = auth.uid()))
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role)
  AND NOT EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id = beneficiary_id AND b.user_id = auth.uid()));