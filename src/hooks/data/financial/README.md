# hooks/data/financial/ — استعلامات البيانات المالية

هذا المجلد يحتوي على **هوكات بيانات** تتعامل مباشرة مع Supabase عبر TanStack Query.

## الدور
- جلب الإيرادات والمصروفات (`useIncome`, `useExpenses`)
- إدارة السنوات المالية (`useFiscalYears`)
- عمليات CRUD على الحسابات والتوزيعات
- استعلامات السُلف والميزانيات

## الفرق عن `hooks/financial/`
| `hooks/financial/` | هذا المجلد (`hooks/data/financial/`) |
|-------------------|-------------------------------------|
| منطق أعمال فقط | استعلامات Supabase (useQuery/useMutation) |
| لا يستورد `supabase` client | يستورد `supabase` client |
| يستهلك بيانات من هنا | يوفر البيانات الخام |

## سياسة الاستيراد
استخدم المسارات المباشرة دائماً:
```ts
import { useFiscalYears } from '@/hooks/data/financial/useFiscalYears';
```
