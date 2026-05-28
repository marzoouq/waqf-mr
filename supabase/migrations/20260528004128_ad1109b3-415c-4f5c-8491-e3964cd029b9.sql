
-- ═════════════════════════════════════════════════════════════════════════
-- RPC: update_beneficiary_self
-- يتيح للمستفيد تعديل رقم حسابه البنكي ورقم هاتفه فقط (بياناته الخاصة).
-- ═════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_beneficiary_self(
  p_bank_account text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS public.beneficiaries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.beneficiaries;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول' USING ERRCODE = '28000';
  END IF;

  -- التحقق من صحة المدخلات
  IF p_bank_account IS NOT NULL THEN
    IF length(trim(p_bank_account)) < 4 OR length(p_bank_account) > 64 THEN
      RAISE EXCEPTION 'رقم الحساب البنكي غير صالح' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_phone IS NOT NULL THEN
    IF length(trim(p_phone)) < 7 OR length(p_phone) > 20 THEN
      RAISE EXCEPTION 'رقم الهاتف غير صالح' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.beneficiaries
     SET bank_account = COALESCE(NULLIF(trim(p_bank_account), ''), bank_account),
         phone        = COALESCE(NULLIF(trim(p_phone), ''), phone),
         updated_at   = now()
   WHERE user_id = v_user_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستفيد مرتبط بحسابك' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_beneficiary_self(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_beneficiary_self(text, text) TO authenticated;
