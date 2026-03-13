# إرشادات المعرفة الأمنية — نظام إدارة وقف مرزوق بن علي الثبيتي

## تصنيف المشروع

هذا **نظام إنتاجي حقيقي** يتعامل مع بيانات حساسة وليس نموذجاً أولياً أو بيئة تجريبية.

## سياق المستخدمين

| الدور | النوع | مستوى الثقة |
|-------|-------|------------|
| ناظر الوقف (admin) | مستخدم داخلي موثوق | عالي |
| محاسب (accountant) | مستخدم داخلي موثوق | عالي |
| مستفيد (beneficiary) | مستخدم خارجي | متوسط — قراءة فقط لبياناته |
| واقف (waqif) | مستخدم خارجي | متوسط — قراءة فقط |

## حساسية البيانات

```text
عالية جداً:
  ├─ أرقام الهوية الوطنية (مشفرة AES-256)
  ├─ أرقام الحسابات البنكية (مشفرة AES-256)
  └─ البريد الإلكتروني وأرقام الهواتف

عالية:
  ├─ البيانات المالية (إيرادات، مصروفات، حصص)
  ├─ العقود والفواتير الضريبية (ZATCA)
  └─ سجل المراجعة الجنائي (audit log)

متوسطة:
  ├─ بيانات العقارات والوحدات
  └─ اللوائح الداخلية
```

## طبقات الحماية المُطبَّقة فعلياً

1. **المصادقة**: تسجيل مقيّد عبر `guard-signup` + تحقق بالبريد الإلكتروني
2. **التفويض**: أدوار في `user_roles` + سياسات RLS تقييدية على 25 جدول
3. **التشفير**: AES-256 للبيانات الشخصية عبر `pgcrypto`
4. **العزل**: كل مستفيد يرى بياناته فقط، السنوات غير المنشورة محجوبة
5. **Edge Functions**: مصادقة يدوية عبر `getUser()` مع تقييد معدل الطلبات
6. **سجل المراجعة**: غير قابل للتعديل أو الحذف، مع تمويه تلقائي للبيانات الحساسة

## توجيهات للماسح الأمني (Scanner Triage Rules)

### إنذارات كاذبة — تجاهل تلقائياً

| الملاحظة | السبب |
|----------|-------|
| `beneficiaries_safe` / `contracts_safe` بدون RLS | عروض VIEW بـ `SECURITY DEFINER` + `security_barrier` — تتجاوز RLS عمداً لتمويه البيانات الحساسة قبل إرجاعها |
| `SECURITY DEFINER VIEW` تحذير على العروض الآمنة | مقصود — العروض تقرأ من الجدول الأصلي بصلاحيات المالك لأن الأدوار الخارجية (waqif/beneficiary) ممنوعة من الوصول المباشر للجداول |
| ثغرات في حزم `devDependencies` (مثل `vite-plugin-pwa`) | أدوات بناء فقط، لا تُشحن مع كود الإنتاج |
| `verify_jwt = false` في Edge Functions | مقصود — Lovable Cloud يستخدم نظام مفاتيح توقيع مختلف، المصادقة تتم يدوياً عبر `getUser()` |

### نتائج تم حلها

| الملاحظة | الحل | تاريخ الحل |
|----------|------|-----------|
| `pgcrypto` في schema `public` | تم نقلها إلى `extensions` schema مع تحديث `search_path` لجميع الدوال المتأثرة (6 دوال: `encrypt_pii`, `decrypt_pii`, `encrypt_beneficiary_pii`, `get_active_zatca_certificate`, `lookup_by_national_id`, `encrypt_zatca_private_key`) | 2026-03-13 |
| وصول `waqif` لبيانات PII في `beneficiaries` | إزالة `waqif` من سياسة SELECT على الجدول الأصلي — الواقف يقرأ حصراً من `beneficiaries_safe` (SECURITY DEFINER) | 2026-03-13 |
| وصول `beneficiary`/`waqif` لهويات المستأجرين في `contracts` | إزالة الدورين من سياسة SELECT على الجدول الأصلي — يقرأون حصراً من `contracts_safe` (SECURITY DEFINER) + تحديث الواجهة لاستخدام `useContractsSafeByFiscalYear` | 2026-03-13 |

### قواعد التصنيف العامة

- **إنذار كاذب**: أي ملاحظة `SECURITY DEFINER VIEW` على `beneficiaries_safe` أو `contracts_safe` — مقصود لتجاوز RLS مع تمويه البيانات
- **إنذار كاذب**: ثغرات في حزم `devDependencies` البحتة التي لا تُشحن للإنتاج
- **خطر مقبول**: إصدارات حزم بدون تحديث متاح upstream

### يتطلب إجراء فوري

- أي جدول جديد بدون سياسات RLS
- أي Edge Function بدون مصادقة (`getUser()` أو `getClaims()`)
- أي تسريب لبيانات PII غير مشفرة
- أي استخدام لـ `getSession()` بدلاً من `getUser()` في Edge Functions
- أي استخدام لـ `SUPABASE_SERVICE_ROLE_KEY` كبديل لمصادقة المستخدم

## مرجع الوظائف الآمنة (Edge Functions Auth Matrix)

| الوظيفة | نوع المصادقة | ملاحظات |
|---------|-------------|---------|
| `admin-manage-users` | `getUser()` + تحقق من دور admin | عمليات مميزة |
| `ai-assistant` | `getUser()` | نطاق المستخدم |
| `guard-signup` | عامة + rate limiting | تسجيل حسابات جديدة |
| `webauthn` | `getUser()` | إدارة بيانات اعتماد |
| `zatca-api` | `getUser()` | تكامل ضريبي |
| `zatca-signer` | `getUser()` | توقيع فواتير |
| `zatca-xml-generator` | `getUser()` | إنشاء XML |
| `check-contract-expiry` | Cron (خادم) | بدون مصادقة مستخدم |
| `generate-invoice-pdf` | `getUser()` | نطاق المستخدم |
| `lookup-national-id` | عامة + rate limiting + timing-safe | نقطة دخول المصادقة بالهوية — لا تتطلب جلسة مسبقة |
| `auth-email-hook` | Hook (Supabase) + webhook signature | بدون مصادقة مستخدم |
