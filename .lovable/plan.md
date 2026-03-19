

# الفحص الجنائي الصادق — بدون تلميع

هذا التقرير يعتمد على بيانات حقيقية من قاعدة البيانات الحية، كود المصدر، والماسح الأمني. لا تقييمات مبالغة.

---

## 1. أخطاء حقيقية مسجّلة في قاعدة البيانات (access_log)

**344 خطأ عميل (client_error) في آخر 7 أيام** — هذا رقم مرتفع.

| الخطأ | العدد | التحليل |
|-------|-------|---------|
| `Test explosion` | 225 | اختبارات ErrorBoundary — غير حقيقي ✅ |
| `Failed to load Arabic fonts for PDF` | 21 | **خطأ حقيقي** — خطوط PDF العربية تفشل في التحميل |
| `QueryCache خطأ في جلب البيانات` | 16 | **خطأ حقيقي** — استعلامات تفشل بصمت |
| `useAuth must be used within AuthProvider` | 14 | **خطأ حقيقي** — مكوّن يُستدعى خارج AuthProvider |
| `DialogContainerContext is not defined` | 8 | **خطأ HMR مؤقت** — أثناء التطوير فقط |
| `EXPIRING_SOON_DAYS is not defined` | 6 | **خطأ HMR مؤقت** — أثناء التطوير |
| `collectionColor is not defined` | 6 | **خطأ HMR مؤقت** |
| `removeChild on Node` | 4 | **خطأ DOM حقيقي** — تعارض React مع عنصر محذوف |
| `getKpiColor before initialization` | 3 | **خطأ HMR مؤقت** |
| `ResponsiveContainer is not defined` | 2 | **خطأ HMR مؤقت** |

**الحكم الصريح**: من أصل 344 خطأ، ~225 اختبارات (تجاهل)، ~25 أخطاء HMR أثناء التطوير (تُصلح تلقائياً بإعادة التحميل)، **~55 خطأ حقيقي في الإنتاج** يحتاج فحص.

---

## 2. مشاكل أمنية حقيقية مكتشفة

### أ. `usePrefetchAccounts.ts` — يقرأ من `beneficiaries` مباشرة بدلاً من `beneficiaries_safe`

```typescript
// سطر 34: يقرأ من الجدول الأصلي — يتجاوز تقنيع PII
supabase.from('beneficiaries').select('*')
```

**الخطورة: متوسطة** — RLS يحمي الصفوف، لكن الناظر/المحاسب يرى `national_id` و `bank_account` غير مشفرة في المتصفح. العرض الآمن `beneficiaries_safe` يقنّع هذه الحقول للأدوار غير المخولة، لكن هذا الـ prefetch يتجاوزه.

### ب. `useWebAuthn.ts` — يستخدم `getSession()` بدون `getUser()` أولاً

```typescript
// سطر 41, 68: يعتمد على الجلسة المحلية بدون تحقق خادم
const { data: { session } } = await supabase.auth.getSession();
```

**الخطورة: منخفضة** — عمليات القراءة فقط (عدد credentials)، لكنها تخالف المعيار المعتمد في المشروع. الوظائف الحساسة (registerBiometric سطر 97) تستخدم `getUser()` بشكل صحيح.

### ج. الماسح الأمني — 2 تحذيرات EXPOSED_SENSITIVE_DATA

العروض الآمنة (`contracts_safe`, `beneficiaries_safe`) تعمل بـ `security_invoker=true` + `security_barrier=true` — **مؤكد من قاعدة البيانات الحية**. الماسح يبلّغ عنها لأن Views لا تملك سياسات RLS مباشرة (ترثها من الجداول الأساسية). **إيجابي كاذب تقنياً**، لكن يجب توثيقه كاستثناء مقبول.

---

## 3. مشاكل كود حقيقية (ليست تجميلية)

### أ. خطوط PDF العربية — 21 خطأ في 7 أيام

`Failed to load Arabic fonts for PDF: TypeError` — هذا يعني أن تصدير PDF يفشل للمستخدمين فعلياً. السبب المحتمل: مسار الخط غير صحيح أو CORS يمنع تحميله.

**الخطورة: عالية وظيفياً** — ميزة أساسية (تصدير تقارير PDF) معطلة جزئياً.

### ب. `select('*')` مستخدم في 17 ملف

كثير من الاستعلامات تجلب جميع الأعمدة بما فيها الحساسة:
- `useContracts.ts` → `contracts_safe.select('*')` — مقبول (العرض يقنّع)
- `useBeneficiaries.ts` → `beneficiaries_safe.select('*')` — مقبول
- `usePrefetchAccounts.ts` → `beneficiaries.select('*')` — **غير مقبول** (يتجاوز التقنيع)
- `useSupportTickets.ts` → `support_ticket_replies.select('*')` — يجلب `content` كامل بدون داعي
- `useTenantPayments.ts` → `tenant_payments.select('*')` — مقبول (لا PII)

### ج. `removeChild on Node` — 4 أخطاء DOM

خطأ React كلاسيكي ينتج عن تعارض بين React وتعديل DOM خارجي (extensions، أو إزالة عنصر أثناء animation). **غير حرج** لكنه يسبب crash للمكوّن.

### د. `useAuth must be used within AuthProvider` — 14 خطأ

مكوّن ما يحاول استخدام `useAuth` خارج `AuthProvider`. السبب المرجح: HMR أو lazy loading يعيد تحميل مكوّن قبل أن يُغلّف بالـ Provider. **مقلق** لأنه يظهر 14 مرة.

---

## 4. مشاكل معمارية (ليست bugs لكنها ديون تقنية)

### أ. `logger.ts` يُسجّل أخطاء بدون `message` — 299 سجل فارغ

```typescript
// سطر 20: args[0] قد يكون undefined
message: String(args[0] ?? '').substring(0, 500),
```

عندما يُستدعى `logger.error(errorObject)` بدون نص، يُسجّل `message: ""`. هذا يجعل 299 من 344 سجل خطأ **غير مفيدة للتشخيص**.

### ب. عدم وجود pagination حقيقي

جميع الاستعلامات تستخدم `limit(500)` أو `limit(1000)` — تحميل مبكر كامل. لا يوجد cursor-based pagination. للبيانات الصغيرة حالياً هذا مقبول، لكنه لن يتحمل نمو البيانات.

### ج. تكرار منطق إعدادات الصوت

`BeneficiarySettingsPage.tsx` و `SettingsPage.tsx` يحتويان نفس منطق إعدادات الصوت والإشعارات بالحرف — كود مكرر بدلاً من hook مشترك.

---

## 5. التقييم الصادق النهائي

```text
┌──────────────────────────────────┬──────┬───────────────────────────────────────┐
│ المجال                            │ النسبة│ السبب الصريح                         │
├──────────────────────────────────┼──────┼───────────────────────────────────────┤
│ RLS وأمان قاعدة البيانات          │ 9.5  │ prefetch يتجاوز safe view            │
│ المصادقة والتفويض                 │ 9    │ 14 خطأ AuthProvider + getSession     │
│ الواجهة (تجاوب/خطوط)             │ 9.5  │ الإصلاحات الأخيرة فعّالة              │
│ وظائف PDF                        │ 7    │ 21 فشل خطوط عربية في أسبوع           │
│ جودة سجل الأخطاء                 │ 6    │ 299 سجل فارغ من 344                  │
│ نظافة الكود                      │ 8    │ select('*') + تكرار + as any بالاختبار│
│ الأداء والتحميل                   │ 8.5  │ lazy load ممتاز، لكن لا pagination   │
│ Edge Functions                   │ 9.5  │ rate limiting + getUser صحيح          │
│ PWA                              │ 9.5  │ skipWaiting + update banner           │
│ التشفير (Vault/PII)              │ 9.5  │ AES-256 + pgsodium ممتاز             │
├──────────────────────────────────┼──────┼───────────────────────────────────────┤
│ التقييم الحقيقي للتطبيق          │ 8.6  │ ليس 10/10 — هناك مشاكل حقيقية       │
└──────────────────────────────────┴──────┴───────────────────────────────────────┘
```

---

## 6. خطة الإصلاح المطلوبة للوصول لـ 10/10 فعلي

| # | الملف | الإصلاح | الأولوية |
|---|-------|---------|---------|
| 1 | `usePrefetchAccounts.ts` سطر 34 | تغيير `beneficiaries` → `beneficiaries_safe` | **حرجة** |
| 2 | تشخيص خطوط PDF العربية | فحص مسار الخطوط + CORS في وظيفة `generate-invoice-pdf` | **عالية** |
| 3 | `logger.ts` سطر 20 | تحسين استخلاص الرسالة: `String(errObj?.message \|\| args[0] \|\| 'unknown')` | **عالية** |
| 4 | `useWebAuthn.ts` أسطر 41, 68 | إضافة `getUser()` قبل `getSession()` للتحقق من الخادم | **متوسطة** |
| 5 | استخلاص hook مشترك لإعدادات الصوت | إنشاء `useNotificationPreferences.ts` يُستخدم في الصفحتين | **منخفضة** |
| 6 | تنظيف سجلات `access_log` القديمة | حذف سجلات `Test explosion` (225 سجل اختبار في الإنتاج) | **منخفضة** |

---

## 7. ما هو ممتاز فعلاً (لا مبالغة)

- **129 سياسة RLS** مع **RESTRICTIVE policies** للسنوات المالية — معمارية أمنية متقدمة
- **security_invoker=true** على العروض — مؤكد من قاعدة البيانات الحية
- **Event Trigger** لسحب صلاحيات `anon` تلقائياً — دفاع عميق حقيقي
- **Vault/pgsodium** لمفتاح التشفير — أعلى معيار أمان ممكن
- **ErrorBoundary** مع chunk recovery + تقارير خطأ للخادم — تعافي ذكي
- **Idle Timeout** مع visibility API — حماية جلسات شاملة
- **guard-signup مع rollback** — منع يتامى المستخدمين
- **معمارية lazy loading** بـ `lazyWithRetry` — إنتاجية عالية

