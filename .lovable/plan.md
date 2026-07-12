# خطة إصلاح نهائية — بدون تغيير تصميم أو سياسات

## تأكيد نطاق الخطة
- ❌ **لا** تعديل UI/تصميم/ألوان/تخطيط
- ❌ **لا** تعديل RLS أو سياسات قاعدة البيانات أو الأدوار
- ❌ **لا** تعديل ملفات محمية (`client.ts`, `types.ts`, `.env`, `config.toml`, Auth)
- ✅ فقط: إصلاح اختبارات فاشلة + تقليل حجم ملفين + تحسين mocks

## المشاكل المؤكّدة بالفحص

| # | الملف | المشكلة | الحل |
|---|-------|--------|------|
| 1 | `src/pages/beneficiary/ExpensesViewPage.tsx` سطر 21 | `import type { SortField } from '@/hooks/page/admin/financial/useExpensesPage'` — انتهاك عزل طبقات (استيراد type من admin إلى beneficiary) | نقل `SortField` إلى `@/types/sorting.ts` أو تعريفه محلياً كـ literal type `'date'` |
| 2 | `src/components/expenses/ExpenseFormDialog.tsx` = 255 سطر | يتجاوز الحد 250 | استخراج قسم "المرفقات" (UI السحب/الإفلات + قائمة الملفات) إلى `ExpenseAttachmentsUploader.tsx` — **نفس التصميم البصري 100%** |
| 3 | `src/hooks/page/admin/financial/useExpensesMutations.ts` = 197 سطر | يتجاوز الحد 180 | استخراج منطق رفع الملفات → `src/lib/expenses/uploadExpenseAttachments.ts` (دالة خالصة) |
| 4 | `src/hooks/page/admin/financial/useExpensesPage.test.ts` (6 حالات) و `src/pages/dashboard/ExpensesPage.test.tsx` (8 حالات) | الـ mock لـ `@/hooks/data/invoices/useInvoices` لا يُصدّر `useCreateInvoice`/`useUpdateInvoice`/`useDeleteInvoice` المستدعاة الآن | توسيع الـ mocks — **لا تغيير على الكود المُختبَر** |
| 5 | `src/lib/diagnostics/fixActions.ts` سطر 65 يستخدم `location.reload()` | يفشل اختبار `no-forced-reload.test.tsx` (ملف جديد ليس في allowlist) | إضافته لـ ALLOWLIST مع تعليق مبرِّر (سياق تشخيصي بعد إصلاح يدوي) — **لا تغيير على السلوك** |

## خطوات التنفيذ

**خطوة 1** — إصلاح انتهاك عزل الطبقات:
- `src/pages/beneficiary/ExpensesViewPage.tsx`: استبدال `import type { SortField } from '@/hooks/page/admin/...'` بتعريف محلي `type SortField = 'date' | 'amount' | 'type'` (نفس القيم).

**خطوة 2** — تقسيم `ExpenseFormDialog`:
- إنشاء `src/components/expenses/ExpenseAttachmentsUploader.tsx` يحتوي على نفس الـ JSX الحالي للسحب/الإفلات وقائمة الملفات المرحّلة.
- `ExpenseFormDialog.tsx` يستبدل الكتلة بـ `<ExpenseAttachmentsUploader {...props} />` — النتيجة المرئية مطابقة.

**خطوة 3** — تقسيم `useExpensesMutations`:
- إنشاء `src/lib/expenses/uploadExpenseAttachments.ts` تحتوي على دالة `uploadExpenseAttachments({ expenseId, files, supabase })` — منطق الرفع + إنشاء صفوف `invoices` بنفس الحقول الحالية.
- الهوك يستدعيها فقط — نفس السلوك.

**خطوة 4** — إصلاح الـ mocks:
```ts
vi.mock('@/hooks/data/invoices/useInvoices', () => ({
  useInvoicesByFiscalYear: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateInvoice:  vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateInvoice:  vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteInvoice:  vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
```

**خطوة 5** — إضافة `src/lib/diagnostics/fixActions.ts` لـ ALLOWLIST في `src/components/pwa/__tests__/no-forced-reload.test.tsx` مع تعليق: `// diagnostics fix action — user-initiated post-fix reload`.

## التحقق النهائي
1. `bunx vitest run` → 0 فشل (كان 20)
2. `npx tsgo --noEmit` → 0 خطأ
3. مراجعة بصرية لنموذج المصروف: قسم المرفقات بنفس المظهر
4. لا migrations — لا تغيير على DB إطلاقاً

## المخرجات
- **ملفات جديدة**: 3 (`ExpenseAttachmentsUploader.tsx`, `uploadExpenseAttachments.ts`, لا شيء آخر)
- **ملفات معدّلة**: 5 (ExpensesViewPage للمستفيد + ExpenseFormDialog + useExpensesMutations + testان + allowlist)
- **migrations**: 0
- **تغييرات UI**: 0
- **تغييرات سياسات/أدوار**: 0
