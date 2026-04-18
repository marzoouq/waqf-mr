-- إسقاط الدالة القديمة وإعادة إنشائها بنفس الاسم وبنية إرجاع موسّعة
DROP FUNCTION IF EXISTS public.get_public_stats();

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_properties_real bigint;
  v_beneficiaries_real bigint;
  v_fiscal_years_real bigint;
  v_stats jsonb := '[]'::jsonb;

  v_prop_mode text;  v_prop_value text;  v_prop_label text;
  v_ben_mode text;   v_ben_value text;   v_ben_label text;
  v_fy_mode text;    v_fy_value text;    v_fy_label text;

  v_final_value text;
  v_final_label text;
BEGIN
  SELECT COUNT(*) INTO v_properties_real    FROM public.properties;
  SELECT COUNT(*) INTO v_beneficiaries_real FROM public.beneficiaries;
  SELECT COUNT(*) INTO v_fiscal_years_real  FROM public.fiscal_years WHERE published = true;

  SELECT value INTO v_prop_mode  FROM public.app_settings WHERE key = 'public_stat_properties_mode';
  SELECT value INTO v_prop_value FROM public.app_settings WHERE key = 'public_stat_properties_value';
  SELECT value INTO v_prop_label FROM public.app_settings WHERE key = 'public_stat_properties_label';

  SELECT value INTO v_ben_mode   FROM public.app_settings WHERE key = 'public_stat_beneficiaries_mode';
  SELECT value INTO v_ben_value  FROM public.app_settings WHERE key = 'public_stat_beneficiaries_value';
  SELECT value INTO v_ben_label  FROM public.app_settings WHERE key = 'public_stat_beneficiaries_label';

  SELECT value INTO v_fy_mode    FROM public.app_settings WHERE key = 'public_stat_fiscal_years_mode';
  SELECT value INTO v_fy_value   FROM public.app_settings WHERE key = 'public_stat_fiscal_years_value';
  SELECT value INTO v_fy_label   FROM public.app_settings WHERE key = 'public_stat_fiscal_years_label';

  v_prop_mode := COALESCE(v_prop_mode, 'auto');
  v_ben_mode  := COALESCE(v_ben_mode, 'auto');
  v_fy_mode   := COALESCE(v_fy_mode, 'auto');

  IF v_prop_mode <> 'hidden' THEN
    v_final_label := COALESCE(NULLIF(TRIM(v_prop_label), ''), 'عقار مُدار');
    v_final_value := CASE WHEN v_prop_mode = 'manual' AND v_prop_value IS NOT NULL THEN v_prop_value ELSE v_properties_real::text END;
    v_stats := v_stats || jsonb_build_object('key','properties','label',v_final_label,'value',v_final_value,'visible',true);
  END IF;

  IF v_ben_mode <> 'hidden' THEN
    v_final_label := COALESCE(NULLIF(TRIM(v_ben_label), ''), 'مستفيد');
    v_final_value := CASE WHEN v_ben_mode = 'manual' AND v_ben_value IS NOT NULL THEN v_ben_value ELSE v_beneficiaries_real::text END;
    v_stats := v_stats || jsonb_build_object('key','beneficiaries','label',v_final_label,'value',v_final_value,'visible',true);
  END IF;

  IF v_fy_mode <> 'hidden' THEN
    v_final_label := COALESCE(NULLIF(TRIM(v_fy_label), ''), 'تقرير سنوي');
    v_final_value := CASE WHEN v_fy_mode = 'manual' AND v_fy_value IS NOT NULL THEN v_fy_value ELSE v_fiscal_years_real::text END;
    v_stats := v_stats || jsonb_build_object('key','fiscal_years','label',v_final_label,'value',v_final_value,'visible',true);
  END IF;

  RETURN jsonb_build_object('stats', v_stats);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;