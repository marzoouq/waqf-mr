# R8-extra — اختبارات Support + RTL sweep

## الاستكشاف

- `useSupportAnalytics.ts` موجود ويحتوي 3 رموز قابلة للاختبار: `useSupportStats`, `useSupportAnalytics`, `fetchTicketsForExport`.
- `usePropertyChecklist` **غير موجود** في الـ codebase (لا hook ولا util ولا component بهذا الاسم). الذِكر في W8 خاطئ — سأُهمله مع توثيقه في التقرير.
- RTL: 99 ملف يستخدم `ml-/mr-/pl-/pr-` (وليس ~50 كما قُدِّر).

## ما سيُنفَّذ

### 1) اختبارات `useSupportAnalytics`
ملف جديد `src/hooks/data/support/useSupportAnalytics.test.ts` يغطي:
- **`useSupportStats`**: mock `rpc('get_support_stats')` → يُرجع كائن الإحصائيات؛ تأكد من `data.totalTickets` وغيره.
- **`useSupportAnalytics` happy path**: mock RPC + mock `parseOrThrow` (أو إدخال بيانات صحيحة) → يُرجع الـ shape.
- **`useSupportAnalytics` schema failure**: RPC يُرجع بيانات ناقصة → الـ query تنتقل لحالة `isError`.
- **`fetchTicketsForExport` success**: mock supabase chain → يُرجع المصفوفة.
- **`fetchTicketsForExport` error**: mock يُرجع `{ error }` → `throw`.

استخدام: `renderHook` + `QueryClient` (retry: false) كما في الاختبارات الموجودة (`useContracts.test.ts` نموذج).

### 2) `usePropertyChecklist` — غير قابل للتنفيذ
- توثيق في `R8-EXECUTED-v2.md` أنه FP من تقرير W8.

### 3) RTL sweep على 99 ملف
**النطاق المضبوط** — استبدال طبقات Tailwind الاتجاهية بمنطقية فقط:
- `ml-{n|auto|px|[..]}` → `me-...` (margin-left → margin-end)
- `mr-{...}` → `ms-...`
- `pl-{...}` → `pe-...`
- `pr-{...}` → `ps-...`
- يدعم variant prefixes: `sm:ml-2` → `sm:me-2`, `hover:pl-1` → `hover:pe-1`, `group-hover:mr-4` → `group-hover:ms-4`.

**Regex المعتمد** (Perl): `(?<![\w-])(ml|mr|pl|pr)-` → الاستبدال مُعجم: `{ml→me, mr→ms, pl→pe, pr→ps}`.

**ما لن يُلمس** (تجنب false positives):
- `border-l/r`, `left-/right-`, `rounded-l/r-` (خارج طلب W8، تحتاج مراجعة فردية).
- ملفات CSS (`.css`, `.scss`) — استبدالات Tailwind only في JSX/TSX.
- التعليقات والـ strings داخل console/logger (regex على className فقط؟ — صعب؛ سنعتمد على الـ word boundary وفحص الـ diff).
- `min-l-`, `max-r-` — لا تُطابق بسبب `\b` ما قبل.

**خطة التحقق الخماسية:**
1. تشغيل الاستبدال على `src/components/` و `src/pages/` و `src/routes/` فقط (نطاق UI).
2. `git diff --stat` لإحصاء التغييرات.
3. `git diff` يدوي على عيّنة من 10 ملفات للتأكد من عدم كسر سياق.
4. `bunx tsc --noEmit` — صفر أخطاء نوعية (الأصناف الجديدة `ms-/me-/ps-/pe-` صالحة في Tailwind v3).
5. `bunx vitest run` — جميع الاختبارات تمر (خاصة snapshot tests إن وُجدت).
6. فحص بصري في `/dashboard` و `/dashboard/contracts` و `/beneficiary/disclosure`.

**Rollback plan**: لو كسر شيء، التراجع ملف-بملف عبر `git checkout HEAD -- <file>`.

### 4) تقرير `audit/forensic-2026-06-17/R8-EXECUTED-v2.md`
- ملخص: ملف اختبار جديد + N ملف RTL مُعدَّل + FP usePropertyChecklist.
- لقطة قبل/بعد لعدد الاستخدامات الاتجاهية.

## ما لن يُنفَّذ
- A11y الشامل (Dialogs, Inputs labels) — جلسة منفصلة.
- `border-l/r`, `left-/right-`, `rounded-l/r-` — تحتاج فحص كل حالة.
- `usePropertyChecklist` test — غير موجود.

## الزمن المتوقع
جلسة قصيرة. الاختبارات ~10 دقائق، RTL sweep + تحقق ~15 دقيقة.

موافق على البدء؟
