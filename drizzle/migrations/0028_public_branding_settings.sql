GRANT SELECT ON public.app_settings TO anon;
CREATE POLICY "Anon can read public branding"
  ON public.app_settings FOR SELECT TO anon
  USING (key = ANY (ARRAY['waqf_logo_url'::text, 'landing_logo_url'::text, 'waqf_name'::text]));