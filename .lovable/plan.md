
# خطة إصلاح تشفير بيانات المستفيدين

## المشكلة
مفتاح التشفير `pii_encryption_key` موجود في الإنتاج (64 حرف)، والدوال (`encrypt_beneficiary_pii`, `encrypt_pii`, `decrypt_pii`, `get_pii_key`) موجودة ايضاً. لكن **الـ trigger المسؤول عن تشغيل التشفير تلقائياً غير موجود** على جدول `beneficiaries` في الإنتاج.

النتيجة: أرقام الهوية الوطنية (14 مستفيد) محفوظة كنص صريح بطول 10 أرقام بدون تشفير.

## السبب الجذري
عملية النشر (pg_dump schema sync) نقلت الدوال لكنها **لم تنقل الـ trigger** من بيئة التطوير إلى الإنتاج.

## خطة الإصلاح

### الخطوة 1: إنشاء migration جديدة
إنشاء migration تقوم بـ:

1. **إنشاء الـ trigger** (مع `CREATE OR REPLACE` / `DROP IF EXISTS` لتجنب الأخطاء):
```sql
DROP TRIGGER IF EXISTS encrypt_beneficiary_pii_trigger ON public.beneficiaries;
CREATE TRIGGER encrypt_beneficiary_pii_trigger
BEFORE INSERT OR UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_beneficiary_pii();
```

2. **تشفير البيانات الحالية** دفعة واحدة:
```sql
-- تعطيل الـ trigger مؤقتاً لتجنب التشفير المزدوج
ALTER TABLE public.beneficiaries DISABLE TRIGGER encrypt_beneficiary_pii_trigger;

-- تشفير national_id و bank_account لكل مستفيد
UPDATE public.beneficiaries
SET 
  national_id = CASE 
    WHEN national_id IS NOT NULL AND national_id != '' AND LENGTH(national_id) < 50
    THEN encode(pgp_sym_encrypt(national_id, (SELECT value FROM app_settings WHERE key = 'pii_encryption_key')), 'base64')
    ELSE national_id
  END,
  bank_account = CASE
    WHEN bank_account IS NOT NULL AND bank_account != '' AND LENGTH(bank_account) < 50  
    THEN encode(pgp_sym_encrypt(bank_account, (SELECT value FROM app_settings WHERE key = 'pii_encryption_key')), 'base64')
    ELSE bank_account
  END
WHERE (national_id IS NOT NULL AND national_id != '' AND LENGTH(national_id) < 50)
   OR (bank_account IS NOT NULL AND bank_account != '' AND LENGTH(bank_account) < 50);

-- إعادة تفعيل الـ trigger
ALTER TABLE public.beneficiaries ENABLE TRIGGER encrypt_beneficiary_pii_trigger;
```

الشرط `LENGTH < 50` يضمن عدم تشفير بيانات مشفرة سابقاً (النص المشفر أطول بكثير من 10-24 حرف).

### الخطوة 2: التحقق بعد التطبيق
بعد تنفيذ الـ migration:
- التأكد من أن `LENGTH(national_id)` أصبح اكبر بكثير من 10 (مشفر base64)
- التأكد من أن `get_beneficiary_decrypted(NULL)` تُرجع الأرقام الأصلية بشكل صحيح
- التأكد من وجود الـ trigger في `information_schema.triggers`

### ملخص التغييرات
| الملف | التغيير |
|---|---|
| `supabase/migrations/[new].sql` | إنشاء trigger + تشفير البيانات الحالية |
| لا تغييرات في الكود | الكود يستخدم `get_beneficiary_decrypted` بالفعل |
