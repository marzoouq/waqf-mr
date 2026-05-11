# خطة الإغلاق النهائي — مكتملة ✅

## المرحلة A (البنود 1–6) — مغلقة سابقاً
1. ✅ `useDashboardSummary` يستخدم `parseOrThrow(dashboardSummarySchema, ...)`
2. ✅ `docs/api/edge-functions.md` محدَّث (17 دالة، verify_jwt، health-check)
3. ✅ `docs/API.md` محدَّث (18 دالة + email-admin/process-email-queue)
4. ✅ `docs/api/README.md` يُعلن مصادر الحقيقة الموزّعة
5. ✅ `WaqifDashboard` نُقل إلى `src/pages/waqif/`
6. ✅ ESLint guards (`no-restricted-syntax`, `no-console: error`)

## المرحلة B (البنود 7–10) — مغلقة بالكامل

| # | البند | الحالة | الدليل |
|---|---|---|---|
| 7 | تفكيك `App.tsx` | ✅ مغلق سابقاً | `App.tsx` = 15 سطراً + `app/{providers,router,root-layout}.tsx` |
| 8 | تفكيك `FiscalYearContext` | ✅ مغلق بالفعل | 77 سطراً، composition نظيف عبر 3 hooks منفصلة (Version I-R) |
| 9 | توحيد `_shared/auth.ts` | ✅ مغلق هذه الجلسة | M1+M2+M3: `zatca-signer`/`zatca-xml-generator`/`ai-assistant` تستخدم `authenticate()` |
| 10 | تقليل `supabase.from()` في `hooks/data/` | ✅ مغلق سابقاً | `rg "supabase\.from\(" src/hooks/data/` = 0 matches |

## النتيجة النهائية

- جميع بنود الإغلاق (1–10) مغلقة.
- لا يوجد عمل متبقٍ ضمن نطاق "قائمة الإغلاق النهائية".
- أي عمل لاحق يخرج عن نطاق هذه الخطة ويحتاج طلباً جديداً.
