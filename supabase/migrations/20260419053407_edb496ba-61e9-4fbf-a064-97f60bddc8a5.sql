-- تصحيح idempotent للنسب الشرعية في جدول المستفيدين
-- هذا الملف آمن للتشغيل عدة مرات؛ التحديث يحدث فقط عند مطابقة القيمة القديمة

DO $$
DECLARE
  v_abdullah_updated INT := 0;
  v_huda_updated INT := 0;
  v_total_after NUMERIC;
BEGIN
  -- 1) تصحيح نسبة عبدالله: 10.290000 → 10.294118
  UPDATE public.beneficiaries
  SET share_percentage = 10.294118,
      updated_at = now()
  WHERE name = 'عبدالله مرزوق الثبيتي'
    AND share_percentage = 10.290000;
  GET DIAGNOSTICS v_abdullah_updated = ROW_COUNT;

  -- 2) تصحيح نسبة هدى: 5.147056 → 5.147059
  UPDATE public.beneficiaries
  SET share_percentage = 5.147059,
      updated_at = now()
  WHERE name = 'هدى مرزوق علي الثبيتي'
    AND share_percentage = 5.147056;
  GET DIAGNOSTICS v_huda_updated = ROW_COUNT;

  -- 3) تسجيل النتيجة في سجل العمليات
  RAISE NOTICE 'Beneficiary share corrections applied: abdullah=% rows, huda=% rows',
    v_abdullah_updated, v_huda_updated;

  -- 4) فحص المجموع للتحقق من السلامة (يجب أن يكون قريباً من 100)
  SELECT ROUND(SUM(share_percentage)::numeric, 6)
    INTO v_total_after
    FROM public.beneficiaries;
  RAISE NOTICE 'Total share_percentage after migration: %', v_total_after;
END
$$;