-- Allow anonymous users to read the registration_enabled setting
CREATE POLICY "Anon can read registration_enabled"
ON public.app_settings
FOR SELECT
USING (key = 'registration_enabled');