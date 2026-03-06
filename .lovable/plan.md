

# خطة: إصلاحات نهائية + اختبارات + تسجيل Edge Functions في config.toml

## نتائج التحقق

| البند | النتيجة |
|-------|---------|
| Edge Function `generate-invoice-pdf` — إغلاق `}` | **تم إصلاحه** ✅ (سطر 476) |
| `paymentInvoice.ts` — upsert fallback | **تم إصلاحه** ✅ (سطر 168-174) |
| مسار `/waqif` في Routes | **موجود** ✅ (سطر 132) |
| مسار `/beneficiary/carryforward` | **موجود** ✅ (سطر 144) |
| `ZatcaManagementPage` + route `/dashboard/zatca` | **موجود** ✅ (سطر 128) |
| `config.toml` — تسجيل ZATCA Edge Functions | **مفقود** — `zatca-api`, `zatca-signer`, `zatca-xml-generator` غير مسجلة |

## المهام المطلوبة

### 1. تسجيل Edge Functions الثلاثة في `config.toml`

الدوال `zatca-api`, `zatca-signer`, `zatca-xml-generator` موجودة كملفات لكنها **غير مسجلة** في `config.toml`. بدون التسجيل، لن يتم نشرها. سنضيف:

```toml
[functions.zatca-api]
  verify_jwt = false
[functions.zatca-signer]
  verify_jwt = false
[functions.zatca-xml-generator]
  verify_jwt = false
```

### 2. إضافة اختبارات وحدة للمكونات الجديدة

**ملفات الاختبار:**

- `src/pages/dashboard/ZatcaManagementPage.test.tsx` — render + tabs display
- `src/pages/beneficiary/WaqifDashboard.test.tsx` — render + charts
- `src/utils/zatcaQr.test.ts` — TLV encoding + QR generation

### 3. تشفير `private_key` في `zatca_certificates`

إضافة trigger مشابه لـ `encrypt_beneficiary_pii` لتشفير `private_key` قبل الحفظ باستخدام `pgp_sym_encrypt`. يتطلب migration جديدة.

## ترتيب التنفيذ

```text
1. تحديث config.toml (إضافة 3 functions)
2. إنشاء اختبارات ZatcaManagementPage
3. إنشاء اختبارات WaqifDashboard
4. إنشاء اختبارات zatcaQr
5. Migration لتشفير private_key
```

