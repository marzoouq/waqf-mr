

## خطة ترحيل مفتاح التشفير إلى Vault

### المشكلة
مفتاح تشفير PII (`pii_encryption_key`) مخزّن في جدول `app_settings` بنفس قاعدة البيانات التي تحتوي على البيانات المشفّرة. أي نسخة احتياطية (pg_dump) تكشف المفتاح والبيانات معاً.

### الحل
نقل المفتاح إلى `vault.secrets` (مُفعّل بالفعل — `supabase_vault v0.3.1`). Vault يُشفّر المفاتيح بمفتاح رئيسي منفصل عبر `pgsodium`، ولا يظهر في pg_dump.

### خطوات التنفيذ

**ترحيل واحد (Migration) يتضمن:**

1. **نسخ المفتاح الحالي إلى Vault:**
   ```sql
   SELECT vault.create_secret(
     (SELECT value FROM app_settings WHERE key = 'pii_encryption_key'),
     'pii_encryption_key',
     'AES-256 key for beneficiary PII encryption'
   );
   ```

2. **تحديث دالة `get_pii_key()`** لتقرأ من `vault.decrypted_secrets` بدلاً من `app_settings`:
   ```sql
   SELECT decrypted_secret INTO v_key
   FROM vault.decrypted_secrets
   WHERE name = 'pii_encryption_key';
   ```

3. **تحديث `lookup_by_national_id()`** — تقرأ المفتاح مباشرة من `app_settings`، يجب تحويلها لاستخدام Vault أيضاً.

4. **حذف الصف القديم** من `app_settings`:
   ```sql
   DELETE FROM app_settings WHERE key = 'pii_encryption_key';
   ```

5. **تحديث سياسة RLS** على `app_settings` — إزالة الاستثناء الخاص بـ `pii_encryption_key` لأنه لم يعد موجوداً.

### الدوال المتأثرة (4 دوال)
| الدالة | التغيير |
|--------|---------|
| `get_pii_key()` | قراءة من Vault بدل `app_settings` |
| `lookup_by_national_id()` | قراءة من Vault بدل `app_settings` |
| `encrypt_beneficiary_pii()` | تستدعي `get_pii_key()` — لا تحتاج تعديل |
| `encrypt_zatca_private_key()` | تقرأ مباشرة من `app_settings` — تحويل لاستخدام `get_pii_key()` |

### الأمان
- جميع الدوال المتأثرة هي `SECURITY DEFINER` — يمكنها الوصول لـ `vault.decrypted_secrets`
- لا تغيير في الكود الأمامي (TypeScript) — كل شيء يمر عبر الدوال المخزنة
- البيانات المشفّرة الحالية تبقى كما هي — نفس المفتاح، مكان تخزين مختلف فقط

### التفاصيل التقنية
- `vault.decrypted_secrets` هو view يفك التشفير أثناء القراءة فقط
- الـ Vault يستخدم `pgsodium` مع مفتاح رئيسي منفصل لا يظهر في pg_dump
- لا حاجة لتغيير أي كود في `src/` — التغيير بالكامل في طبقة قاعدة البيانات

