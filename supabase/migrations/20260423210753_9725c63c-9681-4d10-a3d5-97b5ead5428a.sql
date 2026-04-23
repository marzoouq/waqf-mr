
-- Idempotent fix for app_settings drift in Live
-- Safe to re-run: uses ON CONFLICT and conditional UPDATEs

-- 1) Insert missing keys (no-op if they already exist)
INSERT INTO public.app_settings (key, value) VALUES
  ('zakat_percentage', '2.5'),
  ('auth_hook_custom_access_token', 'enabled')
ON CONFLICT (key) DO NOTHING;

-- 2) Fix waqf_logo_url ONLY if it points to the wrong project bucket
UPDATE public.app_settings
SET value = 'https://nuzdeamtujezrsxbvpfi.supabase.co/storage/v1/object/public/waqf-assets/logo.png',
    updated_at = now()
WHERE key = 'waqf_logo_url'
  AND value LIKE '%epopjqrwsztgxigmgurj%';

-- 3) Set fiscal_year display label ONLY if currently empty/null
UPDATE public.app_settings
SET value = '25/10/2024 - 24/10/2025هـ',
    updated_at = now()
WHERE key = 'fiscal_year'
  AND (value IS NULL OR TRIM(value) = '');

-- 4) Ensure fiscal_year row exists (in case it was never inserted)
INSERT INTO public.app_settings (key, value)
VALUES ('fiscal_year', '25/10/2024 - 24/10/2025هـ')
ON CONFLICT (key) DO NOTHING;

-- 5) Validation log
DO $$
DECLARE
  v_zakat TEXT;
  v_hook TEXT;
  v_logo TEXT;
  v_fy TEXT;
BEGIN
  SELECT value INTO v_zakat FROM public.app_settings WHERE key = 'zakat_percentage';
  SELECT value INTO v_hook FROM public.app_settings WHERE key = 'auth_hook_custom_access_token';
  SELECT value INTO v_logo FROM public.app_settings WHERE key = 'waqf_logo_url';
  SELECT value INTO v_fy FROM public.app_settings WHERE key = 'fiscal_year';

  RAISE NOTICE 'app_settings sync complete: zakat=%, hook=%, logo_ok=%, fiscal_year=%',
    v_zakat, v_hook,
    CASE WHEN v_logo LIKE '%nuzdeamtujezrsxbvpfi%' THEN 'YES' ELSE 'NO' END,
    v_fy;
END
$$;
