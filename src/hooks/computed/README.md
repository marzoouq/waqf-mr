# hooks/financial/ — منطق الأعمال المالي

هذا المجلد يحتوي على **منطق أعمال بحت** (Business Logic) — لا يتضمن أي استدعاءات مباشرة لـ Supabase.

## الدور
- حسابات ختامية وتجميعات مالية
- حساب حصة المستفيد (`useMyShare`)
- أداء العقارات (`usePropertyPerformance`)
- تخصيص العقود (`useContractAllocationMap`)

## الفرق عن `hooks/data/financial/`
| هذا المجلد (`hooks/financial/`) | `hooks/data/financial/` |
|--------------------------------|------------------------|
| منطق أعمال فقط | استعلامات Supabase (useQuery/useMutation) |
| لا يستورد `supabase` client | يستورد `supabase` client |
| يستهلك بيانات من data hooks | يوفر البيانات الخام |

## سياسة الاستيراد
استخدم المسارات المباشرة دائماً:
```ts
import { useMyShare } from '@/hooks/financial/useMyShare';
```
