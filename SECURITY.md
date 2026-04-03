<div dir="rtl">

# السياسة الأمنية — نظام إدارة وقف مرزوق بن علي الثبيتي

> آخر تحديث: 2026-04-03

---

## تصنيف النظام

نظام **إنتاجي حقيقي** يتعامل مع بيانات مالية وشخصية حساسة لإدارة وقف عقاري سعودي.

---

## الإبلاغ عن ثغرات أمنية

إذا اكتشفت ثغرة أمنية، يُرجى التواصل عبر:
- **البريد الإلكتروني**: الاتصال بناظر الوقف مباشرةً عبر البريد المسجل في النظام
- **لا تفصح** عن الثغرة علنياً قبل التواصل معنا
- **وقت الاستجابة المتوقع**: خلال 48 ساعة عمل

---

## حساسية البيانات

| المستوى | البيانات |
|---------|---------|
| **عالية جداً** | أرقام الهوية الوطنية، أرقام الحسابات البنكية (مشفرة AES-256 عبر pgcrypto)، البريد الإلكتروني، أرقام الهواتف |
| **عالية** | البيانات المالية (إيرادات، مصروفات، حصص، توزيعات)، العقود والفواتير الضريبية (ZATCA)، سجل المراجعة الجنائي |
| **متوسطة** | بيانات العقارات والوحدات، اللوائح الداخلية |

---

## طبقات الحماية المُطبَّقة

### 1. المصادقة والجلسات
- تسجيل مقيّد عبر `guard-signup` + تحقق بالبريد الإلكتروني
- مصادقة بيومترية اختيارية (WebAuthn — بصمة / Face ID)
- سياسة تعقيد كلمة مرور (8-128 حرف + حرف كبير أو رقم)
- مهلة أمان للمسارات المحمية
- مسح كافة بيانات الجلسة عند الخروج (`queryClient.clear()` + `clearActiveQueryTimers()`)
- حماية ضد Clickjacking عبر frame-busting

### 2. التفويض والأدوار
- 4 أدوار: `admin`, `accountant`, `beneficiary`, `waqif`
- الأدوار تُخزّن حصراً في جدول `user_roles` — لا localStorage ولا profile
- 134 سياسة RLS على 39 جدول/عرض
- سياسات RESTRICTIVE على الجداول المالية — السنوات غير المنشورة محجوبة
- سجل المراجعة غير قابل للتعديل/الحذف (RLS `USING(false)`)

### 3. تشفير البيانات الحساسة
- AES-256 عبر `pgcrypto` (في schema `extensions`) لأرقام الهوية والحسابات البنكية
- مفتاح التشفير في Supabase Vault (pgsodium) — منفصل عن النسخ الاحتياطية
- تشفير تلقائي للمفاتيح الخاصة لشهادات ZATCA عبر trigger
- تقنيع PII في العروض الآمنة عبر `CASE WHEN has_role()`

### 4. أمن الوظائف الخلفية (16 Edge Function)
- مصادقة يدوية عبر `getUser()` (لا `getSession()`)
- `verify_jwt = false` مقصود — Lovable Cloud يستخدم نظام مفاتيح توقيع مختلف
- تقييد معدل الطلبات (Rate Limiting) على النقاط العامة
- التحقق من المدخلات عبر Zod
- 12 وظيفة محمية بـ JWT + 4 عامة مُبررة بآليات بديلة

### 5. حماية النقاط العامة
| النقطة | الحماية |
|--------|---------|
| `guard-signup` | تحقق من إعداد `registration_enabled` |
| `lookup-national-id` | Rate limit (3/300s) + تأخير تقدمي + استجابة بزمن ثابت + تقنيع البريد |
| `health-check` | لا بيانات حساسة — حالة فقط |
| `auth-email-hook` | يُستدعى من نظام المصادقة فقط + webhook signature |

### 6. سجل المراجعة والمراقبة
- `access_log` لتسجيل أحداث الدخول/الخروج/التنقل
- `audit_log` لتغييرات البيانات (INSERT/UPDATE/DELETE)
- أرشفة تلقائية للسجلات القديمة (`access_log_archive`)
- تمويه تلقائي للبيانات الحساسة في السجلات (`mask_audit_fields`)
- حظر تسجيل PII في السجلات السحابية

### 7. سياسة أمان المحتوى (CSP)
```
default-src 'self';
script-src 'self' https://*.supabase.co;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
object-src 'none'; base-uri 'self'; form-action 'self';
```

### 8. أمن التخزين
- حاوية `invoices`: خاصة — وصول admin + accountant فقط
- حاوية `waqf-assets`: عامة — للشعارات والخطوط فقط (لا بيانات حساسة)

---

## المهام المجدولة الأمنية (pg_cron)

| المهمة | الجدول | الغرض |
|--------|--------|-------|
| تنظيف rate_limits | يومي | منع تراكم سجلات تقييد الطلبات |
| تنظيف الإشعارات | أسبوعي | حذف الإشعارات المقروءة القديمة |
| أرشفة access_log | أسبوعي | نقل السجلات القديمة للأرشيف |
| فحص شهادات ZATCA | يومي 07:00 | تنبيه قبل انتهاء الشهادة |
| فحص الاستعلامات البطيئة | يومي 06:00 | مراقبة الأداء |
| تنظيف تحديات WebAuthn | يومي 03:00 | حذف التحديات المنتهية |

---

## نتائج الفحص الأمني — التصنيف

| # | النتيجة | المصدر | التصنيف | المبرر |
|---|---------|--------|---------|--------|
| 1 | Security Definer View (beneficiaries_safe) | Supabase Linter | ✅ إنذار كاذب | مقصود — security_barrier + CASE WHEN + WHERE auth.uid() IS NOT NULL |
| 2 | Security Definer View (contracts_safe) | Supabase Linter | ✅ إنذار كاذب | نفس النمط — تقنيع PII حسب الدور |
| 3 | Extension in Public (pgcrypto) | Supabase Linter | ✅ إنذار كاذب | pgcrypto في schema extensions فعلاً |
| 4 | contracts_safe PII exposure | Agent Scanner | ✅ محلول | PII مقنّع عبر CASE WHEN + الجدول الأصلي محمي بـ RLS |
| 5 | Raw contracts PII bypass | Agent Scanner | ✅ محلول | beneficiary/waqif مُزالون من SELECT على الجدول الأصلي |
| 6 | PII key colocation | Agent Scanner | ✅ محلول | المفتاح نُقل إلى Vault |
| 7 | lookup-national-id open endpoint | Agent Scanner | ⚠️ خطر مقبول | محمي بـ rate limiting + تأخير + تقنيع — مطلوب لتدفق المصادقة |
| 8 | waqf-assets public bucket | Agent Scanner | ⚠️ خطر مقبول | للشعارات والخطوط فقط — لا بيانات حساسة |
| 9 | Realtime broadcast channels | Agent Scanner | ⚠️ خطر مقبول | النظام يستخدم postgres_changes فقط (محمي بـ RLS) — لا broadcast/presence |

---

## الإصدارات المدعومة

| الإصدار | الدعم |
|---------|-------|
| v3.1.x (الحالي) | ✅ مدعوم |
| v3.0.x | ✅ تحديثات أمنية |
| < v3.0 | ❌ غير مدعوم |

---

## مراجع

- [SECURITY-KNOWLEDGE.md](./docs/SECURITY-KNOWLEDGE.md) — التفاصيل التقنية وقواعد التصنيف
- [FINAL-AUDIT-REPORT.md](./docs/FINAL-AUDIT-REPORT.md) — تقرير التدقيق الشامل

</div>
