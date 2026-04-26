# hooks/financial/ — منطق الأعمال المالي المحسوب

هذا المجلد يحتوي على **منطق أعمال محسوب** (Computed Business Logic) — لا يتضمن أي استدعاءات مباشرة لـ Supabase.

## الدور
- يجمع بيانات خام من `hooks/data/financial/` ويُجري عليها حسابات (حصص، أرصدة، توزيعات).
- يُستهلك من `hooks/page/` فقط — لا يُستهلك مباشرةً من `pages/` أو `components/`.

## الأعضاء
- `useRawFinancialData` — مصدر البيانات الخام الموحَّد لكل الحسابات.
- `useComputedFinancials` — المحرك المالي المركزي (إيرادات/مصروفات/زكاة/توزيع).
- `useMyShare` — حساب حصة المستفيد الفردية مع الحماية ضد القيم السالبة.
- `useAccountsData / useAccountsCalculations / useAccountsActions / useAccountsEditing / useAccountsSettings` — حلقة صفحة الحسابات.
- `usePropertyFinancials / usePropertyPerformance` — مالية العقار الواحد.
- `useContractAllocationMap` — تخصيص دفعات العقود حسب السنة المالية.

## الفرق عن `hooks/data/financial/`
| هذا المجلد (`hooks/financial/`) | `hooks/data/financial/` |
|---|---|
| منطق محسوب (pure derivations) | استعلامات Supabase خام (CRUD) |
| لا `supabase` import | يستخدم `createCrudFactory` |
| يدخل في طبقة `page/` | يدخل في طبقة `financial/` و `page/` |

## الاستيراد
```ts
import { useMyShare } from '@/hooks/financial/useMyShare';
```

## ملاحظة تاريخية
كان هذا المجلد سابقاً `hooks/computed/` — أُعيدت تسميته إلى `financial/` لمطابقة التوثيق في `src/hooks/README.md` وتوضيح أنه يمثّل طبقة "منطق الأعمال المالي" بين `hooks/data/financial/` (CRUD) و `hooks/page/` (orchestration).
