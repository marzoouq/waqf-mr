## الهدف
تفعيل عرض رسائل أخطاء Zod حقلاً بحقل داخل `IncomeFormDialog` و`ExpenseFormDialog` مع إبراز بصري للحقول غير الصالحة، بدلاً من الاكتفاء برسالة toast واحدة عند الإرسال.

## التصميم

### 1. توسيع وحدات التحقق (utils نقية)
- `src/utils/financial/incomeFormValidation.ts`:
  - تصدير `IncomeFieldErrors = Partial<Record<keyof IncomeFormInput, string>>`.
  - إضافة `getIncomeFieldErrors(input): IncomeFieldErrors` يستخدم `safeParse` ويبني خريطة `field → message` من `error.issues[*].path[0]`.
  - الإبقاء على `validateIncomeForm` كما هو لتوافق الاستدعاءات الحالية.
- نفس التوسيع في `expenseFormValidation.ts` (`ExpenseFieldErrors`, `getExpenseFieldErrors`).

### 2. تحديث هوكات الصفحات
- `useIncomePage` و`useExpensesPage`:
  - إضافة `errors` (state) من نوع خريطة الحقول.
  - إضافة `setFieldTouched(field)` يحسب الخطأ لذلك الحقل عند الـ blur.
  - في `handleSubmit`: إذا فشل التحقق، عيّن `errors` بكامل الخريطة (لإبراز كل الحقول) واعرض toast بأول رسالة (سلوك حالي محفوظ).
  - تصفير `errors` ضمن `resetForm` وعند تغيير `formData[field]`.
  - تصدير `errors` و`onFieldBlur` ضمن قيمة الهوك.

### 3. تحديث النماذج (UI فقط)
- `IncomeFormDialog` و`ExpenseFormDialog`:
  - إضافة props: `errors`, `onFieldBlur`.
  - لكل `<Input>` / `<NativeSelect>`:
    - `aria-invalid={!!errors.field}`, `aria-describedby="<field>-error"`.
    - `className` يضيف `border-destructive focus-visible:ring-destructive` عند الخطأ (CSS tokens فقط — لا hex).
    - `onBlur={() => onFieldBlur('field')}`.
  - أسفل كل حقل: `<p id="<field>-error" role="alert" className="text-sm text-destructive">{errors.field}</p>` عند وجود خطأ.

### 4. اختبارات
- توسيع `incomeFormValidation.test.ts` و`expenseFormValidation.test.ts`:
  - `getIncomeFieldErrors` يُرجع خريطة فارغة عند النجاح.
  - يُرجع `source`, `amount`, `date` عند بيانات فاسدة متعددة.
  - يحترم حدود الطول للملاحظات/الوصف.

### 5. التحقق
- `tsc --noEmit` نظيف.
- `vitest run` ينجح بما فيه تحديثات الاختبارات.
- مراجعة بصرية في `/dashboard/income` و`/dashboard/expenses`: ترك حقل فارغ ثم Tab يُظهر إطاراً أحمر ورسالة عربية، والإرسال يُبرز كل الحقول الناقصة دفعة واحدة.

## القيود
- لا تغيير في DB/RLS/Edge Functions/منطق الأعمال.
- لا hex codes — استخدام `text-destructive`, `border-destructive` فقط.
- `utils/` تبقى نقية (لا sonner لا supabase).
- لا تجاوز سقف 200 سطر للنماذج.

## ملفات ستتغير
- تعديل: `src/utils/financial/incomeFormValidation.ts` (+ `.test.ts`)
- تعديل: `src/utils/financial/expenseFormValidation.ts` (+ `.test.ts`)
- تعديل: `src/hooks/page/admin/financial/useIncomePage.ts`
- تعديل: `src/hooks/page/admin/financial/useExpensesPage.ts`
- تعديل: `src/components/income/IncomeFormDialog.tsx`
- تعديل: `src/components/expenses/ExpenseFormDialog.tsx`
