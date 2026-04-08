

# تقرير التدقيق الجنائي — الجولة 9 (فحص 100 بند مقابل الكود الفعلي)

## المنهجية

تم فحص كل بند من الـ 100 في التقرير المُقدَّم مقابل الكود الفعلي الحالي. النتيجة: **~85 بند أُصلحت أو غير صحيحة**، و**~10 بنود مقبولة معمارياً**، و**5 مشاكل حقيقية متبقية**.

---

## البنود المرفوضة (أُصلحت في جولات سابقة أو غير صحيحة أصلاً)

| # | الادعاء | الحالة الفعلية | الدليل |
|---|---------|--------|--------|
| 1 | `timingSafeEqual` مكررة في Edge Functions | **أُصلح** | موجودة فقط في `_shared/auth.ts` — ملف واحد، 9 مطابقات. صفر نسخ محلية |
| 2 | `logger.ts` يستورد من `hooks/` | **أُصلح** | يستورد فقط من `@/lib/errorReporter` (سطر 6) |
| 4 | `useComputedFinancials` vs `useAccountsCalculations` تداخل | **غير صحيح** | كلاهما يستورد utils مشتركة من `utils/financial/` لكنهما يخدمان سياقات مختلفة: الأول للوحة التحكم والثاني لصفحة الحسابات |
| 6 | `useRoleRedirect` في `hooks/ui/` | **أُصلح** | في `src/hooks/auth/useRoleRedirect.ts` ومُصدَّر من `hooks/auth/index.ts` |
| 11, 19 | `TABLE_NAMES_AR` / `getTableNameAr` في hook بيانات | **أُصلح** | نُقلت إلى `utils/format/auditLabels.ts`. الـ hook يُعيد تصديرها فقط للتوافق العكسي (سطر 6) |
| 13 | `isCommercialContract` داخل hook | **أُصلح** | تستخدم `propertyMap.get()` و `unitMap.get()` — O(1) بدلاً من `.find()` |
| 17 | `ErrorBoundary` يتجاهل `Test explosion` | **أُصلح** | `componentDidCatch` لا يحتوي على أي شرط تجاهل (سطر 26-27). بقيت فقط في `diagnostics/checks/storage.ts` لتنظيف queue — مقبول |
| 18 | عدم تناسق `onError` | **أُصلح جزئياً** | `useCloseFiscalYear` الآن يستخدم `defaultNotify.error` (سطر 46) |
| 20 | `isFyAll` معرّفة محلياً في `useComputedFinancials` | **غير صحيح** | يستورد من `@/constants/fiscalYearIds` (سطر 12) |
| 29 | `accessLogService` و `useAccessLog` ازدواجية | **أُصلح** | لا يوجد ملف `useAccessLog.ts`. `logAccessEvent` في `lib/services/accessLogService.ts` فقط. الـ barrel في `hooks/data/audit/index.ts` يُعيد تصديره |
| 46, 48, 49 | `properties.find()` O(N×M) | **أُصلح** | `propertyMap` و `unitMap` عبر `useMemo` (سطر 49-50)، `.get()` بدلاً من `.find()` (سطر 54, 57) |
| 50 | `useIncomeComparison` N+1 queries | **غير صحيح** | استعلام واحد بـ `.in('fiscal_year_id', yearIds)` — استعلامان فقط |
| 63 | `statusLabel` تُعاد إنشاؤها كل render | **أُصلح** | نُقلت خارج الـ hook كدالة module-level (سطر 11-18) |
| 66 | `useCloseFiscalYear.onError` لا يُشعر المستخدم | **أُصلح** | `defaultNotify.error(...)` موجود (سطر 46) |
| 73 | `ErrorBoundary` يتجاهل `Test explosion` | مكرر مع #17 |

---

## البنود المقبولة معمارياً (لا تحتاج تغيير)

| # | الادعاء | سبب القبول |
|---|---------|-----------|
| 7, 8 | `useDashboardRealtime`/`useRealtimeAlerts` في `hooks/ui/` | هذه hooks تُشغّل invalidation وتعرض toasts — وظيفتها UI-facing. تستورد من `lib/realtime/` بشكل صحيح |
| 10 | `useIdleTimeout` في `hooks/ui/` | hook UI بحت (timers + DOM events). المستدعي (`IdleTimeoutManager`) يمرر `onIdle: signOut`. لا يحتوي على منطق auth |
| 43 | `withRouteErrorBoundary` صغير | 276 bytes مقبول كـ utility منفصل — يُبقي `RouteErrorBoundary` نظيفاً |
| 44 | `waqifRoutes` صغير | ملف منفصل لمسارات الواقف يُبقي الـ routing modular |
| 9 | `ZatcaCertificateSafe` في hook | الـ interface خاصة بالـ hook فقط ولا تُستخدم خارجه — مقبول |

---

## المشاكل الحقيقية المتبقية

### 🟠 1. منطق `payment_type` switch مكرر داخل `useAccountsCalculations.ts`
**السطور**: 107-112 (داخل `getExpectedPayments`) و 130-135 (داخل `collectionData`)

نفس الـ `if/else` chain لحساب عدد الدفعات من `totalMonths` مكررة حرفياً. يجب استخراج دالة `getPaymentCountFromMonths(paymentType, months, paymentCount)` مشتركة.

**ملفات**: 1 تعديل

---

### 🟠 2. `totalBeneficiaryPercentage` يُحسب خارج `useMemo` — يُعاد حسابه كل render
**السطر**: 161 — `data.beneficiaries.reduce(...)` خارج أي `useMemo`.

**ملفات**: 1 تعديل

---

### 🟡 3. `PwaUpdateNotifier` يستخدم `toast.success` مباشرة بدلاً من `defaultNotify`
**السطر**: 73 — يتجاوز طبقة deduplication. هذا toast مع `action` callback (لعرض changelog)، لذا `defaultNotify` قد لا يدعمه مباشرة. يحتاج مراجعة هل `defaultNotify` يدعم `action` أم يجب توسيعه.

**ملفات**: 1 تعديل

---

### 🟡 4. `formatDate` wrapper زائد في `auditLog.ts`
**السطر**: 22-28 — يُعرّف `formatDate` كـ wrapper حول `fmtDate` مع `try/catch`. الـ `fmtDate` نفسها تتعامل مع الأخطاء. الـ wrapper زائد.

**ملفات**: 1 تعديل

---

### 🟡 5. اختبارات قديمة تستورد من مسار محذوف `@/hooks/data/useAccessLog`
**الملفات**: `Auth.test.tsx`, `LoginForm.test.tsx`, `PublicPages.test.tsx`, `useWebAuthn.test.ts`

4 ملفات اختبار تستخدم `vi.mock('@/hooks/data/useAccessLog', ...)`. المسار لم يعد موجوداً — الاختبارات تعمل لأن الـ mock يمنع الاستيراد الفعلي، لكن يجب تحديثها إلى `@/lib/services/accessLogService`.

**ملفات**: 4 تعديل

---

## ملخص التنفيذ

| # | المشكلة | الأولوية | الجهد | الملفات |
|---|---------|---------|-------|---------|
| 1 | استخراج دالة `payment_type` switch مشتركة | 🟠 | صغير | 1 |
| 2 | `useMemo` لـ `totalBeneficiaryPercentage` | 🟠 | تافه | 1 |
| 3 | `defaultNotify` بدلاً من `toast` في PWA | 🟡 | صغير | 1 |
| 4 | إزالة `formatDate` الزائد | 🟡 | تافه | 1 |
| 5 | تحديث مسارات mock في 4 اختبارات | 🟡 | تافه | 4 |

**إجمالي**: 5 ملفات متأثرة (+ تعديلات في ملف واحد). صفر تغيير في السلوك الخارجي.

---

## الخلاصة

من أصل 100 ادعاء في التقرير:
- **~75** أُصلحت في الجولات 1–8 السابقة
- **~10** غير صحيحة أصلاً (مثل N+1 في `useIncomeComparison`، `isFyAll` محلية)
- **~10** مقبولة معمارياً (مثل `useIdleTimeout` في `hooks/ui/`)
- **5** مشاكل حقيقية متبقية (مفصّلة أعلاه)

**المشروع في حالة إنتاجية نظيفة.** التحسينات المتبقية محلية وبسيطة.

