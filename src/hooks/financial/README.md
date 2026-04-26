# hooks/computed/ — منطق الأعمال المالي المحسوب

هذا المجلد يحتوي على **منطق أعمال محسوب** (Computed Business Logic) — لا يتضمن أي استدعاءات مباشرة لـ Supabase.

## الدور
- حسابات ختامية وتجميعات مالية (`useComputedFinancials`, `useRawFinancialData`)
- حساب حصة المستفيد (`useMyShare`)
- أداء العقارات (`usePropertyPerformance`, `usePropertyFinancials`)
- تخصيص العقود (`useContractAllocationMap`)
- منطق صفحة الحسابات (`useAccountsData/Calculations/Editing/Actions/Settings`)

## الفرق عن `hooks/data/financial/`
| هذا المجلد (`hooks/computed/`) | `hooks/data/financial/` |
|--------------------------------|------------------------|
| منطق محسوب فقط | استعلامات Supabase (useQuery/useMutation) |
| لا يستورد `supabase` client | يستورد `supabase` client |
| يستهلك بيانات من data hooks | يوفر البيانات الخام |

## سياسة الاستيراد
استخدم المسارات المباشرة دائماً:
```ts
import { useMyShare } from '@/hooks/financial/useMyShare';
```

## ملاحظة تاريخية
كان هذا المجلد سابقاً `hooks/financial/` — أُعيدت تسميته إلى `computed/` لتوضيح
الفصل عن `hooks/data/financial/` (الذي يحوي CRUD queries).
