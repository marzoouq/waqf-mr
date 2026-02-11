-- Create storage bucket for waqf assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('waqf-assets', 'waqf-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view waqf assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'waqf-assets');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can upload waqf assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'waqf-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waqf assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'waqf-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete waqf assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'waqf-assets' AND public.has_role(auth.uid(), 'admin'));

-- Add waqf_logo_url setting
INSERT INTO public.app_settings (key, value) VALUES ('waqf_logo_url', '')
ON CONFLICT (key) DO NOTHING;