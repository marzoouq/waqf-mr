

# إصلاح فلترة العقود في صفحة الحسابات الختامية (الناظر والمستفيد)

## المشكلة

صفحة الحسابات الختامية للناظر (`AccountsPage.tsx`) وللمستفيد (`AccountsViewPage.tsx`) تجلب **جميع** العقود من قاعدة البيانات بدون فلترة حسب السنة المالية المختارة. هذا يتعارض مع التعديل الذي تم تطبيقه في `AdminDashboard.tsx` حيث تم ربط العقود بالسنة المالية عبر `fiscal_year_id`.

**مثال:** عند اختيار سنة 2025-2026 في الحسابات الختامية، ستظهر الـ 20 عقد المسجلة في 2024-2025 رغم أنها لا تنتمي لتلك السنة.

---

## التعديلات المطلوبة

### 1. `src/pages/dashboard/AccountsPage.tsx` (صفحة الناظر)

**أ. إضافة فلترة العقود حسب السنة المالية (بعد سطر 44):**

```typescript
// الحالي:
const { data: contracts = [] } = useContracts();

// الجديد -- إضافة فلترة:
const { data: allContracts = [] } = useContracts();
const contracts = useMemo(() => {
  if (!fiscalYearId || fiscalYearId === 'all') return allContracts;
  return allContracts.filter(c => c.fiscal_year_id === fiscalYearId);
}, [allContracts, fiscalYearId]);
```

هذا يضمن أن جميع الأماكن التي تستخدم `contracts` (جدول العقود، جدول التحصيل، حساب الضريبة التجارية، تصدير PDF) ستتأثر تلقائياً بالفلترة.

**ب. إضافة `useMemo` للاستيراد (سطر 1):**

```typescript
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
```

### 2. `src/pages/beneficiary/AccountsViewPage.tsx` (صفحة المستفيد)

**أ. إضافة فلترة العقود (بعد سطر 53):**

```typescript
// الحالي:
const { data: contracts = [], isLoading: contractsLoading } = useContracts();

// الجديد:
const { data: allContracts = [], isLoading: contractsLoading } = useContracts();
const contracts = useMemo(() => {
  if (!fiscalYearId || fiscalYearId === 'all') return allContracts;
  return allContracts.filter(c => c.fiscal_year_id === fiscalYearId);
}, [allContracts, fiscalYearId]);
```

**ب. إضافة `useMemo` للاستيراد (سطر 1):**

```typescript
import { useState, useMemo } from 'react';
```

### 3. `src/pages/dashboard/AccountsPage.test.tsx`

تحديث mock العقود ليشمل `fiscal_year_id`:

```typescript
useContracts: () => ({
  data: [{
    id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد محمد',
    rent_amount: 120000, ..., fiscal_year_id: 'fy1',
  }],
}),
```

### 4. `src/pages/beneficiary/AccountsViewPage.test.tsx`

تحديث mock العقود ليشمل `fiscal_year_id`:

```typescript
useContracts: () => ({
  data: [
    { id: 'c1', ..., fiscal_year_id: 'fy1' },
    { id: 'c2', ..., fiscal_year_id: 'fy1' },
  ],
}),
```

---

## النتيجة المتوقعة

| السنة المالية | العقود في صفحة الحسابات الختامية |
|--------------|-------------------------------|
| 2024-2025 | 20 عقد (1,259,422 ر.س) |
| 2025-2026 | 0 عقود (لا توجد عقود مسجلة) |

هذا يُطابق سلوك لوحة التحكم الرئيسية ويُوحّد منهجية الفلترة في كافة الصفحات.

