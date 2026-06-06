## الهدف
إنشاء تقرير التدقيق `audit/codebase-audit-2026-06-05.md` بعد التحقق اليدوي من كل البنود، مع إزالة البنود الخاطئة (false positives) وتوثيق النتائج المؤكدة فقط.

## البنود التي ثبت خطأها وتم حذفها
- **P0.1** — `Auth.tsx` لا يستورد من `hooks/data/*` (يستخدم `useAuthPage` من `hooks/application/` بالفعل).
- **P0.2** — `BeneficiaryDashboard.tsx` لا يستورد `useBeneficiaryWidgets()` مباشرة.
- **P3.11** — `src/services/` غير موجود أصلاً (السكربت عدّد دليل غير موجود).
- **P3.12** — `src/hooks/application/README.md` موجود فعلاً.

## البنود المؤكدة (صحيحة)

### P1 — متوسطة
1. **حجم Hooks** — 4 hooks قريبة من حد 200 سطر:
   - `useAnnualReportPage.ts` (200)
   - `useExpensesPage.ts` (194)
   - `useIncomePage.ts` (189)
   - `useCreateInvoiceForm.ts` (180)
2. **حجم Components** — 5 مكونات > 180 سطر (193، 193، 188، 188، 188).
3. **components/common/** — 8 ملفات جذرية مختلطة مع 4 مجلدات فرعية، تحتاج إعادة تصنيف.
4. **lib/contracts/invoiceSync.ts** — لا يوجد ملف README في المجلد.

### P2 — مفيدة
5. **ExpenseFormDialog** — تم إصلاح تكرار `<Input>` في الجلسة السابقة.
6. **3 مكونات** تحتوي على 6 حالات `useState`/`useReducer` — يحتاجون إلى استخراج الحالة إلى hooks صفحات/تطبيقات.

### P3 — اختيارية
7. **scripts/codemod-common-barrel.mjs** — سكربت قديم يجب أرشفته.
8. **conventions-deep-violations.csv** — 5 مخالفات Info فقط (ألوان Hex في Canvas/SVG + حجم hook)، لا Critical ولا Warning.
9. **سكربت العد** — يبلغ `useAnnualReportPage.ts` 201 سطر بينما الملف الفعلي 200 سطر (خلل في منطق العد).

## الحالة العامة المؤكدة
- Conventions Deep: 0 Critical · 0 Warning · 5 Info
- Hooks Layout (263 ملف): 0 مخالفة
- UI Permissions (449 ملف): 0 GAP
- Pages/Components مع `supabase` مباشرة: 0
- `console.*` في الإنتاج: 0
- `sonner` في `utils/`: 0
- Barrel→Barrel: 0

## الخطوة الوحيدة
كتابة الملف `audit/codebase-audit-2026-06-05.md` بالصيغة المحدّثة التي تعكس البنود الصحيحة فقط مع شرح سبب حذف البنود الخاطئة.