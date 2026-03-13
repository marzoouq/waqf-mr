

# نقل pgcrypto من public إلى extensions schema

## المشكلة
الإضافة `pgcrypto` مثبتة في schema `public` وهو ما يخالف أفضل الممارسات الأمنية. يجب نقلها إلى schema `extensions`.

## التحليل
الدوال التي تستخدم pgcrypto (عبر `pgp_sym_encrypt`/`pgp_sym_decrypt`/`gen_salt`/`crypt`):

| الدالة | search_path الحالي |
|--------|-------------------|
| `encrypt_pii` | `public` |
| `decrypt_pii` | `public` |
| `encrypt_beneficiary_pii` (trigger) | `public` |
| `lookup_by_national_id` | `public, extensions` ✅ |
| `get_active_zatca_certificate` | `public` |
| `get_beneficiary_decrypted` | `public` (تستدعي `decrypt_pii`) |

## خطة التنفيذ

**Migration واحدة** تنفذ 3 خطوات بالترتيب:

### 1. نقل الإضافة
```sql
ALTER EXTENSION pgcrypto SET SCHEMA extensions;
```

### 2. تحديث search_path للدوال المتأثرة
إعادة إنشاء 4 دوال بـ `SET search_path TO 'public', 'extensions'`:
- `encrypt_pii`
- `decrypt_pii`
- `encrypt_beneficiary_pii`
- `get_active_zatca_certificate`

(دالة `lookup_by_national_id` لديها بالفعل `public, extensions` — لا تحتاج تعديل)
(دالة `get_beneficiary_decrypted` تستدعي `decrypt_pii` ولا تستخدم pgcrypto مباشرة — لا تحتاج تعديل)

### 3. تحديث التوثيق
- تحديث `docs/SECURITY-KNOWLEDGE.md` لإزالة هذا البند من الإنذارات الكاذبة
- تحديث ignore reason في نتيجة الفحص الأمني (unignore ثم حل)

## المخاطر
- **منخفضة**: `ALTER EXTENSION SET SCHEMA` ينقل جميع الكائنات تلقائياً. الدوال المحدّثة ستجد pgcrypto عبر search_path الجديد.
- يتم التنفيذ في transaction واحدة لضمان الاتساق.

