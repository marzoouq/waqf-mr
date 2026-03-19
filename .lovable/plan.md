

## نتائج التحقق الجنائي — مقابل الكود الفعلي (كل سطر تم قراءته)

---

### جدول التحقق النهائي

| # | الادعاء | الكود الفعلي | الحكم |
|---|---|---|---|
| 1 | `lazyWithRetry` سطور 22-45 + side effect سطر 49 | سطر 22: `function lazyWithRetry(...)` → سطر 45: `);` → سطر 46: `}` → سطر 49: `sessionStorage.removeItem` | **خطأ جزئي** — الدالة تنتهي سطر **46** (`}` إغلاق الدالة) لا 45. سطر 45 هو `);` الذي يغلق `lazy()` فقط |
| 2 | سطر 11 يستورد `lazy, ComponentType` | `import { lazy, Suspense, useState, useEffect, type ComponentType } from "react"` | **صحيح** |
| 3 | Route الجديد بعد سطر 182 | سطر 182: `HistoricalComparisonPage` — سطر 183: فارغ — سطر 184: `{/* Beneficiary Routes */}` | **صحيح** — الإضافة بعد 182 (أو بديلاً في 183 الفارغ) |
| 4 | `DiagnosticOverlay` بعد سطر 397 | سطر 397: `)}` — سطر 398: `</div>` — سطر 399: `);` | **صحيح** — الإضافة بين 397 و 398 |
| 5 | `ROUTE_TITLES` = 36 مدخل | سطور 171-207: عددت **36 مدخل** (من `/dashboard` إلى `/waqif`) | **صحيح** |
| 6 | `allAdminLinks` = 20 عنصر | سطور 34-55: عددت **21 عنصر** (من Home إلى Eye `/beneficiary`) | **خطأ** — العدد **21** لا 20 |
| 7 | `allBeneficiaryLinks` يحتوي `/beneficiary/settings` | سطر 72: `{ to: '/beneficiary/settings', icon: Settings, label: 'الإعدادات' }` | **صحيح** |
| 8 | `maskEmail` إخفاء جزئي | سطر 29: `return name[0] + '***@' + parts[1]` | **صحيح** — `sanitize.ts` يحتاج regex مستقل |
| 9 | `error_log_queue` في localStorage | `ErrorBoundary.tsx` سطر 48: `JSON.parse(localStorage.getItem('error_log_queue')...)` | **صحيح** |
| 10 | `p_event_type` هو string في RPC | `useAccessLog.ts` سطر 13: `p_event_type: event.event_type` — يمرر string | **صحيح** |
| 11 | `role` متاح في DashboardLayout | سطر 42: `const { user, role, signOut } = useAuth()` | **صحيح** — `{role === 'admin' && ...}` يعمل |
| 12 | `constants.ts` يستورد lucide-react | سطور 5-10: نعم، 20+ icon | **صحيح** — `vi.mock` مطلوب في الاختبارات |

---

### الاكتشافات الجديدة من القراءة الفعلية

**1. خطأ في عدد `allAdminLinks`**
كل الخطط السابقة قالت "20 رابط". العدد الفعلي **21 عنصر** (سطور 35-54، من `/dashboard` Home إلى `/beneficiary` Eye). هذا لا يؤثر على التنفيذ لكنه خطأ في التوثيق.

**2. `lazyWithRetry` ينتهي سطر 46 لا 45**
```text
سطر 22: function lazyWithRetry(...) {
سطر 23:   return lazy(() =>
...
سطر 44:     })
سطر 45:   );        ← يغلق lazy()
سطر 46: }            ← يغلق function
```
الحذف الصحيح: سطور **21-49** (شامل التعليق سطر 21 + الدالة 22-46 + سطر فارغ 47 + تعليق 48 + side effect 49).

**3. سطر 47 فارغ وسطر 48 تعليق**
```text
سطر 47: (فارغ)
سطر 48: // مسح حارس إعادة المحاولة عند التحميل الناجح
سطر 49: sessionStorage.removeItem('chunk_retry');
```
أي الحذف يشمل 21-49 = **29 سطر**.

**4. `ROUTE_TITLES` يحتوي `/waqif` (سطر 206-207)**
الخطة تقول "فلتر يشمل `/beneficiary`" — لكن `/waqif` موجود أيضاً. `checkRegisteredRoutes` سيتعامل معه تلقائياً لأنه يقارن `ROUTE_TITLES` (الذي يحتويه) مع `allAdminLinks` (الذي لا يحتويه — `/waqif` ليس في أي من القائمتين). هذا يعني `/waqif` route موجود في `App.tsx` سطر 186 لكن **ليس في `allAdminLinks` أو `allBeneficiaryLinks`** — لن يُفحص. مقبول لأنه route مستقل.

---

### الخطة النهائية — بعد التحقق الفعلي

لا تغييرات جوهرية مطلوبة. التصحيحات:

| البند | كان | الصواب |
|---|---|---|
| `allAdminLinks` | 20 عنصر | **21 عنصر** |
| `lazyWithRetry` ينتهي | سطر 45 | سطر **46** (`}`) |
| نطاق الحذف من App.tsx | "سطور 21-49" | **صحيح** — 21-49 يشمل التعليق + الدالة + الفراغ + التعليق + side effect |

#### الملفات (13 ملف) — لا تغيير عن الخطة السابقة

| # | الملف | العملية |
|---|---|---|
| 1 | `src/lib/lazyWithRetry.ts` | جديد |
| 2 | `src/lib/lazyWithRetry.test.ts` | جديد |
| 3 | `src/lib/pagePerformanceTracker.ts` | تعديل — إضافة `'/dashboard/diagnostics'` في PAGE_LABELS |
| 4 | `src/utils/diagnostics/checks.ts` | جديد — 26 فحص |
| 5 | `src/utils/diagnostics/checks.test.ts` | جديد — مع `vi.mock` لـ constants.ts |
| 6 | `src/utils/diagnostics/sanitize.ts` | جديد — regex مستقل |
| 7 | `src/utils/diagnostics/sanitize.test.ts` | جديد |
| 8 | `src/pages/dashboard/SystemDiagnosticsPage.tsx` | جديد — 6 بطاقات + autoRun + timestamp |
| 9 | `src/components/DiagnosticOverlay.tsx` | جديد — زر عائم z-[60] + lazy modal |
| 10 | `src/hooks/useAccessLog.ts` | تعديل سطر 5 — إضافة `'diagnostics_run'` |
| 11 | `src/App.tsx` | تعديل — حذف 21-49 + تعديل سطر 11 + import + lazy + route |
| 12 | `src/components/DashboardLayout.tsx` | تعديل — import + `{role === 'admin' && <DiagnosticOverlay />}` بعد سطر 397 |
| 13 | `src/components/dashboard-layout/constants.ts` | تعديل — إضافة `'/dashboard/diagnostics': 'تشخيص النظام'` في ROUTE_TITLES |

#### ملخص: الخطة **حقيقية ومتطابقة** مع الكود الفعلي، باستثناء خطأين توثيقيين صغيرين (عدد allAdminLinks + سطر نهاية الدالة) لا يؤثران على التنفيذ.

