

# إصلاح نتائج الفحص الأمني

## ملخص النتائج

تم تحديث الفحص الأمني. من بين 3 نتائج:
- **2 إيجابيات كاذبة** (تم تجاهلها بالفعل أو الآن)
- **1 ثغرة حقيقية** تحتاج إصلاح

---

## النتائج التي تم معالجتها (إيجابيات كاذبة)

| النتيجة | الحالة | السبب |
|---------|--------|-------|
| Extension in Public (pgcrypto) | ✅ مُتجاهل سابقاً | pgcrypto في schema `extensions` وليس `public` |
| contracts_safe بدون RLS | ✅ تم تجاهله الآن | VIEW مع `security_invoker=true` — RLS يُطبّق تلقائياً |
| beneficiaries_safe PII مكشوفة | ✅ مُتجاهل سابقاً | VIEW يُعيد `'***'` لكل حقول PII |

---

## الثغرة الحقيقية: مفتاح ZATCA الخاص يُرسل للمتصفح

**المستوى:** خطأ (Error)

**المشكلة:** ملفان يستخدمان `select('*')` على جدول `zatca_certificates`، مما يُرسل المفتاح الخاص (ECDSA) وكلمة سر ZATCA API إلى المتصفح.

**الملفات المتأثرة:**
1. `src/pages/dashboard/ZatcaManagementPage.tsx` (سطر 75)
2. `src/components/settings/ZatcaSettingsTab.tsx` (سطر 195)

**الإصلاح:** تقييد `select` ليشمل فقط الحقول المطلوبة للعرض:
```ts
.select('id, certificate_type, is_active, request_id, created_at')
```

بدلاً من:
```ts
.select('*')
```

المفتاح الخاص يُستخدم فقط من قبل Edge Functions (`zatca-signer`, `zatca-api`) على الخادم — المتصفح لا يحتاجه أبداً.

**ملف واحد لكل إصلاح** — تغيير سطر واحد في كل ملف.

