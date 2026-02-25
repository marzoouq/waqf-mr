
-- جدول تخزين بيانات اعتماد WebAuthn (البصمة/الوجه)
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  transports text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس على user_id لتسريع البحث
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);

-- تفعيل RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم عرض بيانات اعتمادهم الخاصة فقط
CREATE POLICY "Users can view own webauthn credentials"
ON public.webauthn_credentials FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يمكنهم إضافة بيانات اعتماد خاصة بهم فقط
CREATE POLICY "Users can insert own webauthn credentials"
ON public.webauthn_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- المستخدمون يمكنهم حذف بيانات اعتمادهم الخاصة فقط
CREATE POLICY "Users can delete own webauthn credentials"
ON public.webauthn_credentials FOR DELETE
USING (auth.uid() = user_id);

-- الناظر يمكنه عرض جميع بيانات الاعتماد
CREATE POLICY "Admins can view all webauthn credentials"
ON public.webauthn_credentials FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- جدول التحديات المؤقتة (تُحذف تلقائياً بعد 5 دقائق)
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  challenge text NOT NULL,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس على التحدي للبحث السريع
CREATE INDEX idx_webauthn_challenges_challenge ON public.webauthn_challenges(challenge);

-- تفعيل RLS
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- لا يمكن لأحد الوصول المباشر - فقط عبر Edge Function بصلاحية service_role
CREATE POLICY "No direct access to challenges"
ON public.webauthn_challenges FOR ALL
USING (false);

-- دالة تنظيف التحديات المنتهية (أكثر من 5 دقائق)
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.webauthn_challenges
  WHERE created_at < now() - interval '5 minutes';
END;
$$;
