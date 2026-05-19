## الهدف
إضافة اختبارَي تكامل يضمنان أن صفحتَي الدخل والمصروفات:
1. تستهلكان مسارات hooks الجديدة (post-Core Modularization v7) — لا تسرّب للمسارات القديمة.
2. عمليات CRUD تعكس تغييرات قاعدة البيانات في الواجهة (عبر TanStack Query invalidation).

## الملفات الجديدة (داخل `src/test/`)

### 1) `src/test/incomeExpensesHookPathsContract.test.ts` — عقد المسارات

اختبار static يقرأ الملفات التالية ويتحقق من imports/mocks:

| الملف | يجب أن يحتوي | يجب ألا يحتوي |
|---|---|---|
| `src/hooks/page/admin/financial/useIncomePage.ts` | `@/hooks/data/financial/useIncome`, `@/hooks/data/properties/useProperties`, `@/hooks/data/contracts/useContracts`, `@/hooks/data/invoices/usePaymentInvoices`, `@/hooks/data/settings/usePdfWaqfInfo`, `@/hooks/auth/session/useAuthContext` | `@/hooks/data/useIncome`, `@/hooks/data/useProperties`, `@/hooks/data/useContracts`, `@/hooks/data/usePaymentInvoices`, `@/hooks/data/usePdfWaqfInfo` |
| `src/hooks/page/admin/financial/useExpensesPage.ts` | `@/hooks/data/financial/useExpenses`, `@/hooks/data/invoices/useInvoices`, `@/hooks/data/properties/useProperties`, `@/hooks/data/settings/usePdfWaqfInfo`, `@/hooks/auth/session/useAuthContext` | `@/hooks/data/useExpenses`, `@/hooks/data/useInvoices` |
| `src/pages/dashboard/IncomePage.test.tsx` | نفس المسارات الجديدة في `vi.mock(...)` | المسارات القديمة |
| `src/pages/dashboard/ExpensesPage.test.tsx` | نفس المسارات الجديدة في `vi.mock(...)` | المسارات القديمة |

كل تأكيد عبر regex على المحتوى المقروء بـ `readFileSync`.

### 2) `src/test/incomeExpensesCrudReflection.test.tsx` — انعكاس CRUD على الواجهة

اختبار يستخدم `renderHook` من `@testing-library/react` مع `QueryClientProvider` ومحاكاة Supabase client.

**Mock Supabase chain**:
- `mockDb = { income: [...], expenses: [...] }`
- `supabase.from(table)` يعيد builder يدعم `.select().order().eq().limit().maybeSingle().single()` للقراءة، و`.insert().select().maybeSingle()` و`.update().eq().select().single()` و`.delete().eq()` للكتابة.
- كل mutation تعدّل `mockDb[table]` فعلياً ثم تعيد الصف.

**سيناريو لكل جدول (income, expenses)**:
1. Mount `useXByFiscalYear('fy1')` → تأكيد البيانات الأولية (سجلَين مثلاً).
2. استدعاء `useCreateX().mutateAsync(newRow)` → انتظار refetch → التحقق أن `.data.length === 3` ويحوي الصف الجديد.
3. `useUpdateX().mutateAsync({ id, amount: 99 })` → التحقق أن الصف ظهر بالقيمة الجديدة.
4. `useDeleteX().mutateAsync(id)` → التحقق أن الصف اختفى.

كل خطوة عبر `waitFor` لانتظار invalidateQueries → refetch.

**Mocks الإضافية**:
- `@/lib/notify` (uiNotify silent)
- `@/lib/logger`
- `@/utils/notifications` (notifyAllBeneficiaries no-op)

### التحقق
- `bunx vitest run src/test/incomeExpensesHookPathsContract.test.ts src/test/incomeExpensesCrudReflection.test.tsx`
- التأكد من نجاح جميع الاختبارات.

## النطاق
- ملفان جديدان فقط في `src/test/`.
- لا تعديل على كود الإنتاج أو الـ hooks أو الصفحات.
