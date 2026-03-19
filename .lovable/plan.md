

## خطة: إضافة مفتاح التشفير إلى Vault بشكل مشروط (Idempotent)

### المشكلة
- الـ migration السابق (`20260318171433`) نجح في **Test** لأن المفتاح لم يكن في Vault
- في **Production**: المفتاح موجود في `app_settings` لكن غير موجود في Vault
- محاولة تشغيل `vault.create_secret` يدوياً فشلت (ربما بسبب صلاحيات أو خطأ في الصيغة)

### الحل
إنشاء migration جديد **مشروط** (idempotent) يقوم بـ:

1. التحقق من وجود المفتاح في Vault أولاً
2. إذا غير موجود → نسخه من `app_settings` إلى Vault
3. إذا لم يوجد في `app_settings` أيضاً → إدراجه مباشرة بالقيمة المعروفة
4. لا يحذف من `app_settings` (للأمان)

### التعديل
**ملف واحد: migration SQL جديد**

```sql
DO $$
DECLARE
  v_exists boolean;
  v_key text;
BEGIN
  -- هل المفتاح موجود في Vault؟
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key'
  ) INTO v_exists;

  IF NOT v_exists THEN
    -- محاولة قراءته من app_settings
    SELECT value INTO v_key
    FROM public.app_settings WHERE key = 'pii_encryption_key';

    IF v_key IS NOT NULL AND v_key != '' THEN
      PERFORM vault.create_secret(v_key, 'pii_encryption_key', 'PII encryption key');
    ELSE
      -- إدراج القيمة المعروفة مباشرة
      PERFORM vault.create_secret(
        '4df9561b2a17ed738b0a622e9088dd1139d000c33d600a839649cc7b43452553',
        'pii_encryption_key',
        'PII encryption key for beneficiary data'
      );
    END IF;
  END IF;
END $$;
```

### النتيجة المتوقعة
- **Test**: لا تغيير (المفتاح موجود بالفعل في Vault) ✅
- **Production عند النشر**: ينسخ المفتاح من `app_settings` إلى Vault ✅
- تسجيل الدخول برقم الهوية يعمل في الإنتاج ✅

