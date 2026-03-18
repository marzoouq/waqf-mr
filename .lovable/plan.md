

## خطة تنفيذ DEFER-2: استخراج `useMyShare` hook مشترك

### المشكلة الحالية

حساب `myShare` مكرر في 5 صفحات بتنفيذات مختلفة قليلاً:

| الصفحة | التنفيذ | الفرق |
|--------|---------|-------|
| `BeneficiaryDashboard` | `safeNumber(availableAmount) * (pct ?? 0) / totalBenPct` | `safeNumber` على `availableAmount` |
| `AccountsViewPage` | `availableAmount * safeNumber(pct) / totalBenPct` | `safeNumber` على `share_percentage` |
| `MySharePage` | `availableAmount * (pct ?? 0) / totalBenPct` | بدون `safeNumber` |
| `DisclosurePage` | `availableAmount * (pct ?? 0) / totalBenPct` | بدون `safeNumber` |
| `FinancialReportsPage` | `availableAmount * (pct ?? 0) / totalBenPct` | بدون `safeNumber` |

### الحل

إنشاء hook واحد `useMyShare` يوحد المنطق بأمان:

**ملف جديد:** `src/hooks/useMyShare.ts`

```typescript
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTotalBeneficiaryPercentage } from './useTotalBeneficiaryPercentage';
import { safeNumber } from '@/utils/safeNumber';

interface UseMyShareParams {
  beneficiaries: Array<{ user_id?: string | null; share_percentage?: number | null }>;
  availableAmount: number;
}

export const useMyShare = ({ beneficiaries, availableAmount }: UseMyShareParams) => {
  const { user } = useAuth();
  const { data: totalBenPct = 0, isLoading: pctLoading } = useTotalBeneficiaryPercentage();

  const currentBeneficiary = useMemo(
    () => beneficiaries.find(b => b.user_id === user?.id),
    [beneficiaries, user?.id],
  );

  const myShare = useMemo(() => {
    if (!currentBeneficiary || totalBenPct <= 0) return 0;
    return safeNumber(availableAmount) * safeNumber(currentBeneficiary.share_percentage) / totalBenPct;
  }, [currentBeneficiary, availableAmount, totalBenPct]);

  return { currentBeneficiary, totalBenPct, pctLoading, myShare };
};
```

**التغييرات في 5 ملفات:**

1. **`BeneficiaryDashboard.tsx`** — استبدال الأسطر 38-45 بـ `useMyShare({ beneficiaries, availableAmount })`. حذف imports: `useTotalBeneficiaryPercentage`, `safeNumber`.

2. **`AccountsViewPage.tsx`** — استبدال الأسطر 56-61 بـ `useMyShare(...)`. حذف imports: `useTotalBeneficiaryPercentage`, `safeNumber`.

3. **`MySharePage.tsx`** — استبدال الأسطر 58, 84, 88-92 بـ `useMyShare(...)`. حذف import: `useTotalBeneficiaryPercentage`.

4. **`DisclosurePage.tsx`** — استبدال الأسطر 77-82 بـ `useMyShare(...)`. حذف import: `useTotalBeneficiaryPercentage`.

5. **`FinancialReportsPage.tsx`** — استبدال الأسطر 68-72 بـ `useMyShare(...)`. حذف import: `useTotalBeneficiaryPercentage`.

### الفوائد
- **تنفيذ موحد**: `safeNumber` على كل من `availableAmount` و `share_percentage` — يمنع `NaN`
- **مصدر حقيقة واحد**: أي تعديل مستقبلي يكون في مكان واحد
- **لا كسر**: نفس المنطق، فقط موحد ومحمي

### ملاحظات
- `BeneficiaryDashboard` يستخدم `benError` لتعطيل `currentBeneficiary` — سيُنقل هذا الشرط إلى مستوى الصفحة (تمرير `beneficiaries` فارغة عند `benError`)
- `ReportsPage.tsx` (لوحة الناظر) تستخدم `beneficiariesShare` لكن ليس `myShare` — لا تحتاج التغيير

