## الهدف
تحديث مسارات `vi.mock` في `IncomePage.test.tsx` و`ExpensesPage.test.tsx` لتطابق البنية الحالية بعد Core Modularization v7، وإضافة Mock مفقود لـ `useAuth`.

## التغييرات

### 1) `src/pages/dashboard/IncomePage.test.tsx`
تحديث مسارات `vi.mock`:
| المسار القديم | المسار الجديد |
|---|---|
| `@/hooks/data/useIncome` | `@/hooks/data/financial/useIncome` |
| `@/hooks/data/useProperties` | `@/hooks/data/properties/useProperties` |
| `@/hooks/data/useContracts` | `@/hooks/data/contracts/useContracts` |
| `@/hooks/data/usePaymentInvoices` | `@/hooks/data/invoices/usePaymentInvoices` |
| `@/hooks/data/usePdfWaqfInfo` | `@/hooks/data/settings/usePdfWaqfInfo` |
| `@/hooks/domain/financial/useFiscalYears` | يبقى كما هو (التحقق من الوجود) |

إضافة Mock جديد:
- `@/hooks/auth/session/useAuthContext` → `useAuth` يُعيد `{ role: 'admin' }` لتفعيل `canAdd` ومنع `isLocked`.

### 2) `src/pages/dashboard/ExpensesPage.test.tsx`
تحديث مسارات `vi.mock`:
| المسار القديم | المسار الجديد |
|---|---|
| `@/hooks/data/useExpenses` | `@/hooks/data/financial/useExpenses` |
| `@/hooks/data/useInvoices` | `@/hooks/data/invoices/useInvoices` |
| `@/hooks/data/useProperties` | `@/hooks/data/properties/useProperties` |
| `@/hooks/data/usePdfWaqfInfo` | `@/hooks/data/settings/usePdfWaqfInfo` |

إضافة Mock جديد:
- `@/hooks/auth/session/useAuthContext` → `useAuth` يُعيد `{ role: 'admin' }`.

### 3) التحقق
- تشغيل `bunx vitest run src/pages/dashboard/IncomePage.test.tsx src/pages/dashboard/ExpensesPage.test.tsx`
- التأكد من نجاح جميع الاختبارات (6 لـ Income و8 لـ Expenses).
- في حال فشل اختبارات بسبب اختلافات في النصوص (مثل عنوان "إدارة الدخل" vs النص الفعلي في الصفحة)، أُحدّث النصوص لتطابق ما يعرضه الـ Page الحالي.

## النطاق
- ملفان فقط داخل `src/pages/dashboard/`.
- لا تغييرات على كود الإنتاج أو الهوكس أو الصفحات.
