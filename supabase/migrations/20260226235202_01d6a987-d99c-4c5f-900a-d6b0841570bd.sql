
-- 1. تفعيل pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. دالة تشفير
CREATE OR REPLACE FUNCTION public.encrypt_pii(p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_value IS NULL OR p_value = '' THEN
    RETURN p_value;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(p_value, current_setting('app.pii_encryption_key', true)),
    'base64'
  );
END;
$$;

-- 3. دالة فك تشفير (للناظر والمحاسب فقط)
CREATE OR REPLACE FUNCTION public.decrypt_pii(p_encrypted text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_encrypted IS NULL OR p_encrypted = '' THEN
    RETURN p_encrypted;
  END IF;
  -- فقط admin أو accountant يمكنهم فك التشفير
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RETURN '********';
  END IF;
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(p_encrypted, 'base64'),
      current_setting('app.pii_encryption_key', true)
    );
  EXCEPTION WHEN OTHERS THEN
    -- إذا كانت القيمة غير مشفرة (نص عادي قديم)، أعدها كما هي
    RETURN p_encrypted;
  END;
END;
$$;

-- 4. دالة لتشفير بيانات مستفيد عند INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_beneficiary_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- تشفير رقم الهوية إذا لم يكن مشفراً بالفعل
  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    BEGIN
      -- اختبار إذا كان مشفراً بالفعل
      PERFORM pgp_sym_decrypt(decode(NEW.national_id, 'base64'), current_setting('app.pii_encryption_key', true));
    EXCEPTION WHEN OTHERS THEN
      -- ليس مشفراً، نشفره
      NEW.national_id := encode(pgp_sym_encrypt(NEW.national_id, current_setting('app.pii_encryption_key', true)), 'base64');
    END;
  END IF;

  -- تشفير رقم الحساب البنكي
  IF NEW.bank_account IS NOT NULL AND NEW.bank_account != '' THEN
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.bank_account, 'base64'), current_setting('app.pii_encryption_key', true));
    EXCEPTION WHEN OTHERS THEN
      NEW.bank_account := encode(pgp_sym_encrypt(NEW.bank_account, current_setting('app.pii_encryption_key', true)), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. إنشاء trigger لتشفير تلقائي
CREATE TRIGGER encrypt_beneficiary_pii_trigger
BEFORE INSERT OR UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_beneficiary_pii();

-- 6. دالة لعرض البيانات مع فك التشفير (للناظر)
CREATE OR REPLACE FUNCTION public.get_beneficiary_decrypted(p_beneficiary_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  national_id text,
  bank_account text,
  email text,
  phone text,
  share_percentage numeric,
  notes text,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بعرض البيانات المفكوكة';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    public.decrypt_pii(b.national_id) as national_id,
    public.decrypt_pii(b.bank_account) as bank_account,
    b.email,
    b.phone,
    b.share_percentage,
    b.notes,
    b.user_id
  FROM public.beneficiaries b
  WHERE b.id = p_beneficiary_id OR p_beneficiary_id IS NULL;
END;
$$;

-- 7. تشفير البيانات الحالية
-- نضبط مفتاح التشفير أولاً عبر ALTER DATABASE
DO $$
DECLARE
  enc_key text;
  rec record;
BEGIN
  enc_key := current_setting('app.pii_encryption_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN
    RAISE NOTICE 'مفتاح التشفير غير مضبوط، تخطي تشفير البيانات الحالية';
    RETURN;
  END IF;

  -- تعطيل trigger مؤقتاً لتجنب التشفير المزدوج
  ALTER TABLE public.beneficiaries DISABLE TRIGGER encrypt_beneficiary_pii_trigger;

  FOR rec IN SELECT b.id, b.national_id, b.bank_account FROM public.beneficiaries b
  LOOP
    UPDATE public.beneficiaries SET
      national_id = CASE
        WHEN rec.national_id IS NOT NULL AND rec.national_id != '' THEN
          encode(pgp_sym_encrypt(rec.national_id, enc_key), 'base64')
        ELSE rec.national_id
      END,
      bank_account = CASE
        WHEN rec.bank_account IS NOT NULL AND rec.bank_account != '' THEN
          encode(pgp_sym_encrypt(rec.bank_account, enc_key), 'base64')
        ELSE rec.bank_account
      END
    WHERE id = rec.id;
  END LOOP;

  ALTER TABLE public.beneficiaries ENABLE TRIGGER encrypt_beneficiary_pii_trigger;
END;
$$;

-- 8. سحب صلاحيات التنفيذ من الأدوار العامة
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) FROM anon;
