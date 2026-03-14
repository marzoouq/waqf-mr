
-- ═══════════════════════════════════════════════════════════════
-- Z-1: إصلاح get_next_icv بـ PostgreSQL SEQUENCE
-- يمنع Race Condition نهائياً — كل استدعاء يحصل على قيمة فريدة ذرياً
-- ═══════════════════════════════════════════════════════════════

-- إنشاء Sequence يبدأ من 1 (لا يوجد بيانات حالياً)
CREATE SEQUENCE IF NOT EXISTS public.icv_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- استبدال الدالة لتستخدم Sequence بدلاً من MAX(icv)+1
CREATE OR REPLACE FUNCTION public.get_next_icv()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN nextval('public.icv_seq');
END;
$$;

-- تحديث allocate_icv_and_chain لاستخدام Sequence بدلاً من LOCK TABLE + MAX
CREATE OR REPLACE FUNCTION public.allocate_icv_and_chain(p_invoice_id uuid, p_invoice_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_icv int;
  v_previous_hash text;
BEGIN
  -- التحقق من صلاحية المستدعي
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتخصيص ICV';
  END IF;

  -- الحصول على ICV ذري من الـ Sequence — لا حاجة لقفل الجدول
  v_icv := nextval('public.icv_seq');

  -- الحصول على آخر هاش (PIH) — قفل صف واحد فقط
  SELECT invoice_hash INTO v_previous_hash
  FROM public.invoice_chain
  ORDER BY icv DESC
  LIMIT 1
  FOR UPDATE;

  v_previous_hash := COALESCE(v_previous_hash, '0');

  -- إدراج في السلسلة
  INSERT INTO public.invoice_chain (invoice_id, icv, invoice_hash, previous_hash)
  VALUES (p_invoice_id, v_icv, p_invoice_hash, v_previous_hash);

  RETURN jsonb_build_object(
    'icv', v_icv,
    'previous_hash', v_previous_hash
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Z-2: تشفير private_key في zatca_certificates تلقائياً
-- يستخدم نفس مفتاح PII الموجود في app_settings
-- ═══════════════════════════════════════════════════════════════

-- دالة المشغّل: تشفير private_key عند INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_zatca_private_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_key text;
BEGIN
  -- الحصول على مفتاح التشفير
  SELECT value INTO v_key FROM public.app_settings WHERE key = 'pii_encryption_key';
  
  IF v_key IS NULL OR v_key = '' THEN
    -- إذا لم يوجد مفتاح، نحفظ بدون تشفير (للتوافق)
    RETURN NEW;
  END IF;

  -- تشفير private_key فقط إذا لم يكن مشفراً مسبقاً
  IF NEW.private_key IS NOT NULL AND NEW.private_key != '' THEN
    BEGIN
      -- محاولة فك التشفير — إذا نجحت فهو مشفر مسبقاً
      PERFORM extensions.pgp_sym_decrypt(decode(NEW.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      -- ليس مشفراً → نشفّره الآن
      NEW.private_key := encode(extensions.pgp_sym_encrypt(NEW.private_key, v_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء المشغّل على جدول zatca_certificates
DROP TRIGGER IF EXISTS encrypt_zatca_pk_trigger ON public.zatca_certificates;
CREATE TRIGGER encrypt_zatca_pk_trigger
  BEFORE INSERT OR UPDATE OF private_key ON public.zatca_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_zatca_private_key();
