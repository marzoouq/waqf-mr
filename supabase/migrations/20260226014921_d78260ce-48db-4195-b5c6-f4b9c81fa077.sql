
-- RPC function for atomic share distribution
-- Replaces sequential client-side calls with a single transactional operation
CREATE OR REPLACE FUNCTION public.execute_distribution(
  p_account_id uuid,
  p_fiscal_year_id uuid DEFAULT NULL,
  p_total_distributed numeric DEFAULT 0,
  p_distributions jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dist jsonb;
  v_beneficiary_id uuid;
  v_beneficiary_name text;
  v_beneficiary_user_id uuid;
  v_share_amount numeric;
  v_advances_paid numeric;
  v_carryforward_deducted numeric;
  v_net_amount numeric;
  v_deficit numeric;
  v_today date := CURRENT_DATE;
  v_remaining numeric;
  v_cf record;
  v_cf_amount numeric;
  v_with_share int := 0;
  v_with_deficit int := 0;
BEGIN
  -- Validate caller is admin or accountant
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ التوزيع';
  END IF;

  -- Validate account exists
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id) THEN
    RAISE EXCEPTION 'الحساب الختامي غير موجود';
  END IF;

  -- Process each distribution inside the same transaction
  FOR dist IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_beneficiary_id := (dist->>'beneficiary_id')::uuid;
    v_beneficiary_name := dist->>'beneficiary_name';
    v_beneficiary_user_id := NULLIF(dist->>'beneficiary_user_id', '')::uuid;
    v_share_amount := COALESCE((dist->>'share_amount')::numeric, 0);
    v_advances_paid := COALESCE((dist->>'advances_paid')::numeric, 0);
    v_carryforward_deducted := COALESCE((dist->>'carryforward_deducted')::numeric, 0);
    v_net_amount := COALESCE((dist->>'net_amount')::numeric, 0);
    v_deficit := COALESCE((dist->>'deficit')::numeric, 0);

    -- 1. Create distribution record if net > 0
    IF v_net_amount > 0 THEN
      INSERT INTO public.distributions (beneficiary_id, account_id, amount, status, date, fiscal_year_id)
      VALUES (v_beneficiary_id, p_account_id, v_net_amount, 'pending', v_today, p_fiscal_year_id);
      v_with_share := v_with_share + 1;
    END IF;

    -- 2. Settle active carryforwards
    IF v_carryforward_deducted > 0 THEN
      v_remaining := v_carryforward_deducted;
      FOR v_cf IN
        SELECT id, amount FROM public.advance_carryforward
        WHERE beneficiary_id = v_beneficiary_id AND status = 'active'
        ORDER BY created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_remaining <= 0;
        v_cf_amount := v_cf.amount;
        IF v_cf_amount <= v_remaining THEN
          UPDATE public.advance_carryforward SET status = 'settled' WHERE id = v_cf.id;
          v_remaining := v_remaining - v_cf_amount;
        ELSE
          UPDATE public.advance_carryforward SET amount = v_cf_amount - v_remaining WHERE id = v_cf.id;
          v_remaining := 0;
        END IF;
      END LOOP;
    END IF;

    -- 3. Create new carryforward if deficit exists
    IF v_deficit > 0 AND p_fiscal_year_id IS NOT NULL THEN
      INSERT INTO public.advance_carryforward (beneficiary_id, from_fiscal_year_id, amount, status, notes)
      VALUES (
        v_beneficiary_id,
        p_fiscal_year_id,
        v_deficit,
        'active',
        'ترحيل فرق سُلف من السنة المالية - ' || v_beneficiary_name
      );
      v_with_deficit := v_with_deficit + 1;

      -- Notify beneficiary about carryforward
      IF v_beneficiary_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          v_beneficiary_user_id,
          'ترحيل فرق سُلف',
          'تم ترحيل مبلغ ' || v_deficit::text || ' ر.س كفرق سُلف للسنة المالية القادمة',
          'warning',
          '/beneficiary/my-share'
        );
      END IF;
    END IF;
  END LOOP;

  -- 4. Update distributions_amount in the account
  UPDATE public.accounts
  SET distributions_amount = p_total_distributed
  WHERE id = p_account_id;

  -- 5. Notify all beneficiaries
  BEGIN
    PERFORM public.notify_all_beneficiaries(
      'تم توزيع الحصص',
      'تم توزيع حصص الريع بإجمالي ' || p_total_distributed::text || ' ر.س. يرجى مراجعة صفحة "حصتي من الريع".',
      'success',
      '/beneficiary/my-share'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notification is optional, don't fail the transaction
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'with_share', v_with_share,
    'with_deficit', v_with_deficit
  );
END;
$$;

-- Revoke execute from public/anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.execute_distribution FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_distribution FROM anon;
GRANT EXECUTE ON FUNCTION public.execute_distribution TO authenticated;
