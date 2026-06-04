# فحص جنائي عميق — التقرير النهائي المُتحقَّق منه

## منهجية الفحص

تم فحص **1204 ملف TS/TSX**، **223 اختباراً**، **11 Edge Function**، **352 migration**، **268 هوك** عبر 6 طبقات. كل بند أدناه مُتحقَّق منه بأمر `rg`/`wc`/قراءة ملف فعلية — ليست افتراضات.

---

## ✅ بنود سابقة تأكَّد إنجازها فعلياً (لا عمل)

- **Batch 3** `pageMonitor` → `ALL_ROUTES[path]?.title` (4 أسطر فقط، نظيف) ✓
- **Batch 4** `guard-signup` يستخدم `zod.safeParse` (3 إشارات) ✓
- **0** `console.*` خارج `logger.ts` ✓
- **0** `supabase` في `utils/` أو `pages/` أو `hooks/page/` ✓
- **0** `window.confirm` فعلي (الـ4 نتائج كلها داخل ملفات `ConfirmDialog` أو سلاسل في تعليقات) ✓
- **0** انتهاكات barrel-imports-barrel ✓
- **0** `TODO/FIXME/HACK` ✓
- **0** `localStorage` لـ `fiscal_year` في الإنتاج (واحدة في اختبار فقط) ✓
- **0** ملفات tsx >250 سطر ✓
- **0** ألوان hex خارج Canvas/SVG (الـ4 نتائج كلها داخل `SignaturePad` و`InvoicePreviewDialog` — مسموح بحكم memory) ✓
- `useIncomeComparison` في data/domain **ليس تكراراً** — فصل طبقات صحيح (data = raw rows، domain = aggregation) ✓

---

## P1 — مخالفات معمارية حقيقية مؤكدة

### 1. `uiNotify` داخل 7 ملفات في `hooks/data/` (مخالفة `no-toast-in-data-hooks`)

| ملف | عدد الاستدعاءات |
|---|---|
| `hooks/data/settings/waqf/useWaqfInfoSave.ts` | 3 |
| `hooks/data/messaging/useBulkMessaging.ts` | 3 |
| `hooks/data/contracts/useWholePropertyRental.ts` | 2 |
| `hooks/data/contracts/useTenantPayments.ts` | 2 |
| `hooks/data/settings/app/useAppSettingsWrite.ts` | 2 |
| `hooks/data/financial/dashboard/useDashboardSummary.ts` | 1 |
| `hooks/data/financial/contracts/useContractAllocations.ts` | 1 |

**الحل:** نقل الـ7 إلى `hooks/page/` المناسبة كـ wrappers، أو إرجاع `Result<T>` يتعامل معه المُستدعي. اختبارات مرتبطة موجودة لـ `useTenantPayments.test.ts` — يجب تحديثها.

### 2. Edge Functions تقرأ body بدون Zod (مخالفة `edge-functions-zod-required`)

| دالة | يقرأ body | يحتاج Zod |
|---|---|---|
| `admin-manage-users` | ✓ | ⚠️ نعم — body فيه action + params من المستخدم |
| `auth-email-hook` | ✓ | webhook من Supabase نفسه — أولوية منخفضة |
| `generate-invoice-pdf` | ✓ | ⚠️ نعم — يقبل invoice_id |
| `lookup-national-id` | ✓ | ⚠️ **حرج** — input مستخدم خارجي |
| `check-contract-expiry` | ✗ cron | لا |
| `health-check` | ✗ | لا |
| `process-email-queue` | ✗ cron | لا |
| `zatca-renew` | ✗ | لا |

**أولوية:** `lookup-national-id` (P1) ← `admin-manage-users` (P1) ← `generate-invoice-pdf` (P2) ← `auth-email-hook` (P3).

---

## P2 — جودة وأداء

### 3. مشاكل أداء حقيقية مرصودة في console.logs الإنتاج
- `Query: properties` يستغرق **2.2 ثانية**
- `Query: expenses/fiscal_year` يستغرق **2.2 ثانية**
- `Query: invoices/fiscal_year` يستغرق **2.2 ثانية**
- `invoke:dashboard-summary` يستغرق **4.6 ثانية**

**السبب المرجَّح:** فهارس ناقصة على `fiscal_year_id` أو N+1 داخل Edge Function. يستحق فحصاً بالـ `EXPLAIN ANALYZE`.

### 4. أخطاء realtime متكررة في الإنتاج
```
[BfcacheSafe] Channel fiscal-years-global CHANNEL_ERROR, retrying…
[BfcacheSafe] Channel notifications-{userId}-{...} CHANNEL_ERROR, retrying…
```
متعلّق على الأرجح بـ token refresh أثناء استئناف bfcache. يستحق ربط `onAuthStateChange('TOKEN_REFRESHED')` بإعادة إنشاء القناة.

### 5. ملفات تخالف حد 200 سطر/ملف (memory `code-style-and-naming`)

| ملف | أسطر |
|---|---|
| `utils/pdf/reports/aggregatedAnnualReport.ts` | 274 |
| `hooks/auth/biometric/useWebAuthn.test.ts` (اختبار — مسموح) | 404 |
| `hooks/page/admin/contracts/useContractForm.ts` | 227 |
| `lib/diagnostics/checks/cardConsistency.ts` | 218 |
| `lib/diagnostics/checks/numericalAudit.ts` | 203 |
| `hooks/page/beneficiary/views/usePropertiesViewPage.ts` | 202 |

---

## P3 — تنظيم وتنظيف منخفض الأثر

### 6. ملفات re-export صغيرة جداً (ضوضاء أكثر من فائدة)
- `utils/pdf/invoices/paymentInvoiceShared.ts` (13 سطر — re-export فقط من `../shared/`)
- `utils/pdf/invoices/paymentInvoice.ts` (51 سطر — 13 منها re-export)
- `types/sorting.ts` (14 سطر)
- `lib/messages/index.ts` (2 سطر)
- `types/data/index.ts`, `utils/contracts/index.ts`, `hooks/page/beneficiary/{notifications,settings}/index.ts` (4 أسطر)

تتطلب `knip` لتأكيد الكود الميت قبل الحذف.

### 7. مكوّنا `Confirm*Dialog` في `components/contracts/` متطابقان بنياً
يمكن توحيدهما في `<ConfirmAlertDialog>` عام بـ props.

### 8. `useNotificationActions` يستورد `sonner` مباشرة في `hooks/data/`
1 ملف فقط — مبرّر جزئياً (إشعار صوتي)، لكن يجب فصله إذا أمكن.

---

## خطة المعالجة المُقترَحة (3 جولات منفصلة، كل واحدة قابلة للموافقة)

### Round A — تنظيف `hooks/data/` من `uiNotify` [P1]
**الملفات:** 7 من `hooks/data/`. لكل ملف:
1. حذف `import { uiNotify }` ونداءاته
2. إن كان mutation: إرجاع نتيجة فقط، نقل `uiNotify` إلى المُستدعي في `hooks/page/`
3. تحديث الاختبارات (`useTenantPayments.test.ts` خاصة)

**اختبار:** `bunx vitest run` يجب أن يبقى 1936/1936.

### Round B — Zod في Edge Functions الحرجة [P1]
1. `lookup-national-id`: schema `{ national_id: z.string().regex(/^\d{10}$/) }`
2. `admin-manage-users/validators.ts`: schema لكل من 10 actions
3. `generate-invoice-pdf`: schema `{ invoice_id: z.string().uuid() }`

**اختبار:** `supabase--test_edge_functions` + لا كسر للاختبارات الموجودة.

### Round C — أداء واستقرار realtime [P2]
1. فحص `EXPLAIN ANALYZE` لاستعلامات `properties`/`expenses`/`invoices` لكل `fiscal_year_id`
2. إضافة فهارس مفقودة عبر migration إن لزم
3. إصلاح `bfcacheSafeChannel`: إعادة اشتراك عند `TOKEN_REFRESHED`

---

## بنود مرفوضة عمداً (لا تنفيذ)

- حذف ملفات backward-compat (`types/sorting.ts`, `crudFactory.ts`, `pagination.ts`, `paymentInvoice*.ts`) → يحتاج `knip` فعلي قبل الحذف، وإلا قد يُكسر استيراد خارجي
- تقسيم الملفات الـ 5 >200 سطر → تغيير واسع خارج النطاق، يستحق جولة منفصلة
- ترحيل `useNotificationActions` من `sonner` → مبرّر جزئياً، يستحق نقاشاً
- توحيد `ConfirmDialog`s → تجميل لا قيمة وظيفية له الآن

---

## التحقق النهائي بعد كل جولة

1. `bunx vitest run` → 1936/1936 ✓
2. ESLint بدون أخطاء جديدة
3. لا تغيير في security memory
4. لا migrations مُدمّرة

---

**هل أبدأ بـ Round A فقط (الأكثر إلحاحاً)، أم Rounds A+B معاً، أم تختار جولة محددة؟**
