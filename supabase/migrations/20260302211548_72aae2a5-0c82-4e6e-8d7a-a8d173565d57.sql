-- Seed pii_encryption_key if not already present
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('pii_encryption_key', encode(gen_random_bytes(32), 'hex'), now())
ON CONFLICT (key) DO NOTHING;