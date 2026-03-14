
-- =============================================
-- الجولة السادسة: إصلاحات CRIT-14, CRIT-15, HIGH-25
-- =============================================

-- ============================================================
-- 1. CRIT-14: إصلاح lookup_by_national_id — إزالة فحص auth.uid()
--    الدالة مصممة للاستدعاء من service_role فقط عبر Edge Function
--    الحماية عبر REVOKE وليس عبر فحص auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_by_national_id(p_national_id text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_key text;
  rec record;
  v_decrypted text;
BEGIN
  -- جلب مفتاح التشفير مباشرة (بدون get_pii_key لأنها تتحقق من auth.uid)
  v_key := (SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key' LIMIT 1);
  
  IF v_key IS NULL OR v_key = '' THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT b.national_id AS enc_nid, b.email AS ben_email
    FROM public.beneficiaries b
    WHERE b.national_id IS NOT NULL
  LOOP
    BEGIN
      v_decrypted := pgp_sym_decrypt(decode(rec.enc_nid, 'base64'), v_key);
      IF v_decrypted = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- بيانات غير مشفرة — مقارنة مباشرة
      IF rec.enc_nid = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- سحب الصلاحيات — service_role فقط
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM PUBLIC;

-- ============================================================
-- 2. CRIT-15 + MED-30: تحديث auto_revoke_anon_execute
--    إضافة قائمة استثناء للدوال المخصصة لـ service_role فقط
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_revoke_anon_execute()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  obj record;
  -- قائمة الدوال المخصصة لـ service_role فقط — لا تُمنح EXECUTE لـ authenticated
  service_role_only_functions text[] := ARRAY[
    'lookup_by_national_id',
    'get_pii_key',
    'decrypt_pii',
    'encrypt_pii',
    'get_active_zatca_certificate'
  ];
  func_name text;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE object_type = 'function' AND schema_name = 'public'
  LOOP
    -- استخراج اسم الدالة بدون schema والمعاملات
    func_name := split_part(split_part(obj.object_identity, '(', 1), '.', 2);
    
    -- دائماً: سحب من anon و PUBLIC
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', obj.object_identity);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', obj.object_identity);
    
    -- منح authenticated فقط إذا لم تكن في قائمة الاستثناء
    IF NOT (func_name = ANY(service_role_only_functions)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;

-- إعادة إنشاء الـ event trigger (تعمل فقط على CREATE FUNCTION، ليس ALTER)
DROP EVENT TRIGGER IF EXISTS trg_auto_revoke_anon_execute;
CREATE EVENT TRIGGER trg_auto_revoke_anon_execute
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION')
EXECUTE FUNCTION public.auto_revoke_anon_execute();

-- ============================================================
-- 3. HIGH-25: إصلاح check_rate_limit — فحص الحد بعد الإدراج
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- تنظيف عشوائي للسجلات القديمة
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  -- محاولة جلب السجل الحالي مع قفل
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- سجل جديد — إدراج مع معالجة التزامن
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1;
    
    -- إعادة قراءة العداد بعد الإدراج للتحقق من الحد
    SELECT count INTO v_count FROM rate_limits WHERE key = p_key;
    RETURN COALESCE(v_count, 1) > p_limit;
  END IF;

  -- إذا انتهت النافذة الزمنية — إعادة تعيين
  IF v_window_start < now() - (p_window_seconds || ' seconds')::interval THEN
    UPDATE rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN false;
  END IF;

  -- زيادة العداد
  UPDATE rate_limits SET count = v_count + 1 WHERE key = p_key;
  RETURN (v_count + 1) > p_limit;
END;
$$;
