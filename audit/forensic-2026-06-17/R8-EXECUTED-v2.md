# R8-extra — اختبارات Support + RTL Sweep

## 1) اختبارات `useSupportAnalytics` ✅

ملف جديد: `src/hooks/data/support/useSupportAnalytics.test.ts` — **6 اختبارات تمر**:
- `useSupportStats` — happy path + تحقق من mapping
- `useSupportAnalytics` — happy path عبر Zod
- `useSupportAnalytics` — فشل Zod ينتقل إلى `isError`
- `fetchTicketsForExport` — success / data=null / error throw

## 2) `usePropertyChecklist` — FP من W8

غير موجود في الـ codebase (لا hook ولا util ولا component). الذِكر في تقرير W8 خاطئ.
**القرار:** أُهمل.

## 3) RTL Sweep ✅

**النطاق:** `src/components/` + `src/pages/` + `src/routes/`
**الاستبدال:** `ml-→me-`, `mr-→ms-`, `pl-→pe-`, `pr-→ps-` (Tailwind logical properties)
**Regex:** `(?<![\w-])(ml|mr|pl|pr)-` — يمنع false positives مثل `min-l-`, `margin-left:` (preceded by word char).

**النتيجة:**
- **191 استبدال** عبر **99 ملف**
- **0 استخدامات اتجاهية متبقية** في النطاق
- **224 اختبار يمر، 0 فشل** بعد الاستبدال
- variant prefixes تُعالج تلقائياً (`sm:ml-2 → sm:me-2`, `hover:pl-1 → hover:pe-1`)

**ما لم يُلمس عمداً:**
- `border-l/r`, `left-/right-`, `rounded-l/r-` — خارج طلب W8، يحتاج مراجعة فردية
- ملفات CSS/SCSS — لم يطبَّق فيها sweep

## 4) ملخص

| البند | الحالة |
|---|---|
| W8-#1 اختبار bootstrap | ✅ مُصلَح (R8) |
| W8-#1 اختبار useSupportAnalytics | ✅ مُضاف (6 اختبارات) |
| W8-#1 اختبار usePropertyChecklist | ⚪ FP — لا hook بهذا الاسم |
| W8-#4 RTL utilities | ✅ 191 استبدال / 99 ملف |
| إجمالي الاختبارات بعد R8-v2 | **224 يمر / 0 فشل** |
