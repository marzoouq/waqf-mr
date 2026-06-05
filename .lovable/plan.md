## السياق

صفحات إدارة الدخل والمصروفات (`IncomePage`, `ExpensesPage`) ونماذج CRUD (`IncomeFormDialog`, `ExpenseFormDialog`) والهوكس (`useIncomePage`, `useExpensesPage`) **مكتملة بالفعل** وتعمل: إضافة، تعديل، حذف بتأكيد، فلترة، ترتيب، تصدير PDF/CSV، RLS، وقفل السنوات المغلقة.

**الملاحظة الوحيدة**: التحقق من المدخلات حالياً سلسلة `if` يدوية مكررة حرفياً بين `useIncomePage` (السطور 65-67) و`useExpensesPage` (السطور 65-67)، بدون مخطط مركزي يمكن اختباره أو إعادة استخدامه.

## النطاق

تنفيذ التوصية #11 من الخطة الأم: استخراج تحقق نماذج الدخل والمصروفات إلى وحدات `utils/` نقية باستخدام Zod، وتحويل الهوكس إلى orchestrators صغيرة.

خارج النطاق: أي تغيير في الواجهة، الـ DB، RLS، Edge Functions، أو منطق الأعمال.

## الخطوات

### 1. ملف تحقق الدخل
إنشاء `src/utils/financial/incomeFormValidation.ts`:
- `incomeFormSchema` (Zod) — يتحقق من: `source` (نص غير فارغ ≤200)، `amount` (رقم موجب ≤ `MAX_FINANCIAL_AMOUNT`)، `date` (ISO)، `property_id` (UUID اختياري)، `notes` (≤500 اختياري).
- `validateIncomeForm(formData)` — يُرجع `{ success: true, data } | { success: false, error: string }` برسائل عربية.
- لا استيراد من `sonner` أو `supabase` (utils نقية).

### 2. ملف تحقق المصروفات
إنشاء `src/utils/financial/expenseFormValidation.ts` بنفس النمط:
- `expenseFormSchema` — `expense_type`, `amount`, `date`, `property_id?`, `description?`.
- `validateExpenseForm(formData)`.

### 3. اختبارات وحدة
- `incomeFormValidation.test.ts` — حالات: فارغ، مبلغ سالب/تجاوز الحد، تاريخ صالح، خصائص اختيارية.
- `expenseFormValidation.test.ts` — نفس الحالات.

### 4. تحديث `useIncomePage`
استبدال السطور 65-67 بـ:
```ts
const result = validateIncomeForm(formData);
if (!result.success) { uiNotify.error(result.error); return; }
const { amount } = result.data;
```

### 5. تحديث `useExpensesPage`
نفس التحويل في السطور 65-67.

### 6. التحقق
- `tsc --noEmit` ينجح.
- `vitest run` ينجح بما فيها الاختبارات الجديدة.
- لا تغيير سلوكي مرئي للمستخدم.

## ملفات ستتغير
- جديد: `src/utils/financial/incomeFormValidation.ts` + `.test.ts`
- جديد: `src/utils/financial/expenseFormValidation.ts` + `.test.ts`
- تعديل: `src/hooks/page/admin/financial/useIncomePage.ts` (حوالي 5 أسطر)
- تعديل: `src/hooks/page/admin/financial/useExpensesPage.ts` (حوالي 5 أسطر)

## معايير القبول
- منطق تحقق مكرر يصبح مركزياً ومُختبَراً.
- الهوكس أصغر وأكثر تركيزاً على التنسيق فقط.
- جميع رسائل الخطأ بالعربية وتطابق السلوك الحالي.
