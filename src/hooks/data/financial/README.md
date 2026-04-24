# hooks/data/financial/ — استعلامات البيانات المالية

هذا المجلد يحتوي على **هوكات بيانات** تتعامل مباشرة مع Supabase عبر TanStack Query.

## الدور
- جلب الإيرادات والمصروفات (`useIncome`, `useExpenses`)
- إدارة السنوات المالية (`useFiscalYears`)
- عمليات CRUD على الحسابات والتوزيعات
- استعلامات السُلف والميزانيات

## الفرق عن `hooks/computed/`
| `hooks/computed/` | هذا المجلد (`hooks/data/financial/`) |
|-------------------|-------------------------------------|
| منطق محسوب فقط (selectors) | استعلامات Supabase (useQuery/useMutation) |
| لا يستورد `supabase` client | يستورد `supabase` client |
| يستهلك بيانات من هنا | يوفر البيانات الخام |

## التنظيم المقترح للنمو المستقبلي

عند تجاوز 35 ملفاً، يُنصح بتقسيم الملفات إلى مجلدات فرعية:

```
hooks/data/financial/
├─ accounts/        ← useAccounts*, useAccountCategories
├─ advances/        ← useAdvance*, useMaxAdvanceAmount
├─ distribution/    ← useDistribut*, useTotalBeneficiaryPercentage
├─ expenses/        ← useExpenses*, useExpenseBudgets
├─ income/          ← useIncome*
├─ fiscal-year/     ← useFiscalYear*, useCloseFiscalYear, useDashboardSummary
└─ contracts/       ← useContractAllocations
```

ملاحظة: حالياً (30 ملف) التنظيم flat مقبول. نقل الملفات سيكسر >70 import — يُؤجَّل حتى تستحق الفائدة التكلفة.

## سياسة الاستيراد
استخدم المسارات المباشرة دائماً:
```ts
import { useFiscalYears } from '@/hooks/data/financial/useFiscalYears';
```
