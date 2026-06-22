# M3 — Forensic Route & Page Audit
**Date:** 2026-06-22  
**Scope:** `src/App.tsx`, `src/app/router.tsx`, `src/routes/*.tsx`, `src/routes/ProtectedRouteHelper.tsx`, `src/constants/routeRoles.ts`, `src/constants/bottomNavLinks.ts`, `src/pages/**`  
**Method:** Static analysis — no code modified.

---

## Route Inventory (49 total)

| # | Path | File | Guard | Roles |
|---|------|------|-------|-------|
| 1 | `/` | publicRoutes.tsx:18 | none | public |
| 2 | `/auth` | publicRoutes.tsx:19 | none | public |
| 3 | `/unauthorized` | publicRoutes.tsx:20 | none | public |
| 4 | `/privacy` | publicRoutes.tsx:21 | none | public |
| 5 | `/terms` | publicRoutes.tsx:22 | none | public |
| 6 | `/install` | publicRoutes.tsx:23 | none | public |
| 7 | `/reset-password` | publicRoutes.tsx:24 | none | public |
| 8 | `*` | publicRoutes.tsx:28 | none | catch-all → NotFound |
| 9 | `/dashboard` | adminRoutes.tsx:36 | pr(ADMIN_ROLES) | admin, accountant |
| 10 | `/dashboard/properties` | adminRoutes.tsx:37 | pr(ADMIN_ROLES) | admin, accountant |
| 11 | `/dashboard/contracts` | adminRoutes.tsx:38 | pr(ADMIN_ROLES) | admin, accountant |
| 12 | `/dashboard/income` | adminRoutes.tsx:39 | pr(ADMIN_ROLES) | admin, accountant |
| 13 | `/dashboard/expenses` | adminRoutes.tsx:40 | pr(ADMIN_ROLES) | admin, accountant |
| 14 | `/dashboard/beneficiaries` | adminRoutes.tsx:41 | pr(ADMIN_ROLES) | admin, accountant |
| 15 | `/dashboard/reports` | adminRoutes.tsx:42 | pr(ADMIN_ROLES) | admin, accountant |
| 16 | `/dashboard/accounts` | adminRoutes.tsx:43 | pr(ADMIN_ROLES) | admin, accountant |
| 17 | `/dashboard/distributions` | adminRoutes.tsx:44 | pr(ADMIN_ROLES) | admin, accountant |
| 18 | `/dashboard/messages` | adminRoutes.tsx:45 | pr(ADMIN_ROLES) | admin, accountant |
| 19 | `/dashboard/invoices` | adminRoutes.tsx:46 | pr(ADMIN_ROLES) | admin, accountant |
| 20 | `/dashboard/audit-log` | adminRoutes.tsx:47 | pr(ADMIN_ROLES) | admin, accountant |
| 21 | `/dashboard/bylaws` | adminRoutes.tsx:48 | pr(ADMIN_ROLES) | admin, accountant |
| 22 | `/dashboard/support` | adminRoutes.tsx:49 | pr(ADMIN_ROLES) | admin, accountant |
| 23 | `/dashboard/annual-report` | adminRoutes.tsx:50 | pr(ADMIN_ROLES) | admin, accountant |
| 24 | `/dashboard/chart-of-accounts` | adminRoutes.tsx:51 | pr(ADMIN_ROLES) | admin, accountant |
| 25 | `/dashboard/comparison` | adminRoutes.tsx:52 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 26 | `/dashboard/users` | adminRoutes.tsx:55 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 27 | `/dashboard/settings` | adminRoutes.tsx:56 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 28 | `/dashboard/zatca` | adminRoutes.tsx:57 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 29 | `/dashboard/diagnostics` | adminRoutes.tsx:58 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 30 | `/dashboard/email-monitor` | adminRoutes.tsx:59 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 31 | `/dashboard/audit-report-final` | adminRoutes.tsx:60 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 32 | `/dashboard/cleanup-report` | adminRoutes.tsx:61 | pr(ADMIN_ONLY, withPermission=false) | admin |
| 33 | `/beneficiary` | beneficiaryRoutes.tsx:28 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 34 | `/beneficiary/properties` | beneficiaryRoutes.tsx:29 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 35 | `/beneficiary/contracts` | beneficiaryRoutes.tsx:30 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 36 | `/beneficiary/disclosure` | beneficiaryRoutes.tsx:31 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 37 | `/beneficiary/my-share` | beneficiaryRoutes.tsx:32 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 38 | `/beneficiary/financial-reports` | beneficiaryRoutes.tsx:33 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 39 | `/beneficiary/accounts` | beneficiaryRoutes.tsx:34 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 40 | `/beneficiary/settings` | beneficiaryRoutes.tsx:35 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 41 | `/beneficiary/messages` | beneficiaryRoutes.tsx:36 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 42 | `/beneficiary/invoices` | beneficiaryRoutes.tsx:37 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 43 | `/beneficiary/expenses` | beneficiaryRoutes.tsx:38 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 44 | `/beneficiary/notifications` | beneficiaryRoutes.tsx:39 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 45 | `/beneficiary/bylaws` | beneficiaryRoutes.tsx:40 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 46 | `/beneficiary/carryforward` | beneficiaryRoutes.tsx:41 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 47 | `/beneficiary/support` | beneficiaryRoutes.tsx:42 | pr(BENEFICIARY_ROLES) | admin, beneficiary |
| 48 | `/beneficiary/annual-report` | beneficiaryRoutes.tsx:43 | pr(ALL_NON_ACCOUNTANT) | admin, beneficiary, waqif |
| 49 | `/waqif` | waqifRoutes.tsx:12 | pr(['admin','waqif'], withPermission=false) | admin, waqif |

**Protected routes total: 41** (routes 9–49) — matches `EXPECTED_ROUTE_COUNT = 41` ✓

---

## Issues Found

| Route / Page | Issue | Severity | File:Line | Evidence | Recommendation |
|---|---|---|---|---|---|
| `routeRoles.ts` header comment | تناقض: يقول "39 مساراً" لكن الفعلي 41، ويقول "17 ADMIN_ROLES + 5 ADMIN_ONLY" لكن الفعلي 16 + 8 | 🟡 MEDIUM | `src/constants/routeRoles.ts:5-8` | الجدول الفعلي: 16 ADMIN_ROLES + 8 ADMIN_ONLY = 24 admin. `EXPECTED_ROUTE_COUNT=41` صحيح | صحّح التعليق: "41 مساراً محمياً: 16 ADMIN_ROLES + 8 ADMIN_ONLY + 16 beneficiary + 1 waqif" |
| `/waqif` | أدوار مُكوَّدة يدوياً بدلاً من ثابت مُسمَّى | 🟡 MEDIUM | `src/routes/waqifRoutes.tsx:12` | `pr(['admin', 'waqif'] as AppRole[], ...)` — لا يوجد `WAQIF_ROLES` في `roles.ts` بينما كل المسارات الأخرى تستخدم ثوابت | أضف `export const WAQIF_ROLES: AppRole[] = ['admin', 'waqif']` في `roles.ts` واستخدمه |
| `/dashboard/audit-report-final` و `/dashboard/cleanup-report` | غائبان عن `ACCOUNTANT_EXCLUDED_ROUTES` رغم كونهما ADMIN_ONLY | 🟡 MEDIUM | `src/constants/navigation.ts:201` | `ACCOUNTANT_EXCLUDED_ROUTES` يقول "لا حاجة لإدراجهما" (تعليق سطر 199) لكنهما مسارات admin-only فعلية — التوثيق مُضلِّل | أضفهما للثابت أو وثّق صراحةً أن ProtectedRoute هو الحاجز الأول |
| `/auth` | Suspense مزدوج (redundant) | 🟢 LOW | `src/routes/publicRoutes.tsx:19` + `src/app/root-layout.tsx:49` | `publicRoutes.tsx:19` يلف `<Auth>` بـ `<Suspense fallback={<AuthSkeleton/>}>` فيما RootLayout يلف `<Outlet>` بـ `<Suspense fallback={<PageLoader/>}>` — الداخلي يُلغي الخارجي للمسار هذا فقط | الازدواجية مقصودة (skeleton أفضل من PageLoader للـ auth). وثّق ذلك بتعليق صريح في publicRoutes.tsx |
| `ADMIN_ROUTE_ICONS` | مساران محميان (`/audit-report-final`, `/cleanup-report`) بلا icon | 🟢 LOW | `src/constants/navigation.ts:43-66` | الروتان موجودان في `ADMIN_SIDEBAR_HIDDEN` فلا يظهران في القائمة — لا أثر وظيفي، لكن `allAdminLinks` يرمي `Error` عند أي مسار غير مُدرَج في ICONS إن أُزيل من HIDDEN | إضافة الأيقونتين تحسباً أو تعليق يوضح الاعتماد على HIDDEN |
| صفحات يتيمة | لا صفحات يتيمة — كل ملفات `src/pages/` مرتبطة بمسار أو مستوردة داخلياً | ✅ NONE | — | `SupportPage.tsx` مستورد lazy من `SupportPageGuard.tsx:16` وليس مسار مباشر | — |
| روابط NavLink/Link | جميع الروابط الثابتة تشير لمسارات موجودة | ✅ NONE | — | فُحصت: `/dashboard/*`, `/beneficiary/*`, `/waqif`, `/privacy`, `/terms`, `/install`, `/auth`, `/unauthorized` — جميعها صالحة | — |
| Lazy + Suspense | كل المسارات محمية بـ Suspense عبر RootLayout | ✅ NONE | `src/app/root-layout.tsx:49-51` | `<Suspense fallback={<PageLoader />}><Outlet /></Suspense>` يغطي كل lazy routes | — |
| NotFound 404 | Catch-all `*` موجود ويعرض `NotFound` | ✅ NONE | `src/routes/publicRoutes.tsx:28` | `<Route path="*" element={eb(<NotFound />)} />` مُدرَج آخر المسارات | — |
| `ProtectedRoute` — صحة الأدوار | كل مسار محمي يستخدم الدور الصحيح مطابقاً لـ `ROUTE_ROLES` | ✅ NONE | مقارنة: `routeRoles.ts` vs `adminRoutes.tsx`, `beneficiaryRoutes.tsx`, `waqifRoutes.tsx` | 41 مساراً تم مطابقتها فردياً — لا تعارض | — |

---

## ملخص

| الخطورة | العدد |
|---|---|
| 🔴 CRITICAL | 0 |
| 🟡 MEDIUM | 3 |
| 🟢 LOW | 2 |
| ✅ NONE (نظيف) | 6 محاور |

### أبرز النتائج
1. **بنية التوجيه سليمة** — كل 41 مساراً محمياً يستخدم `ProtectedRoute` بالأدوار الصحيحة.
2. **لا صفحات يتيمة** — `SupportPage.tsx` يبدو يتيماً للوهلة الأولى لكنه مُستهلَك lazy بواسطة `SupportPageGuard.tsx`.
3. **Suspense مُعالَج مركزياً** في `RootLayout:49` — الازدواجية على `/auth` مقصودة.
4. **المشاكل الثلاث متوسطة** هي توثيقية/ثوابت فقط — لا خطر أمني أو وظيفي.

