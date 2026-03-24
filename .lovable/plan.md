

# خطة إصلاح المشاكل المتبقية (4 مشاكل)

---

## المشاكل المكتشفة

| # | المشكلة | الشدة |
|---|---------|-------|
| 1 | `activeIncome` في `PropertiesPage.tsx` لا يستخدم `allocationMap` | 🔴 |
| 2 | `activeIncome` في `PropertiesViewPage.tsx` لا يستخدم `allocationMap` | 🔴 |
| 3 | `CollectionReport` — `0 >= 0` يعطي "مكتمل" خطأً | 🔴 |
| 4 | توثيق fallback "جميع السنوات" في `contractualRevenue` | 🟡 |

---

## الإصلاحات

### 1. `PropertiesPage.tsx` سطر 107 — `activeIncome` بالتخصيص

```typescript
// قبل
activeIncome = contracts.filter(c => isSpecificYear || c.status === 'active')
  .reduce((s, c) => s + Number(c.rent_amount), 0);

// بعد — نفس منطق contractualRevenue
const relevantContracts = contracts.filter(c => isSpecificYear || c.status === 'active');
activeIncome = relevantContracts.reduce((s, c) => {
  const alloc = allocationMap.get(c.id);
  return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? Number(c.rent_amount) : 0));
}, 0);
```

### 2. `PropertiesViewPage.tsx` سطر 87 — نفس الإصلاح

```typescript
// قبل
activeIncome = relevantContracts.reduce((s, c) => s + safeNumber(c.rent_amount), 0);

// بعد
activeIncome = relevantContracts.reduce((s, c) => {
  const alloc = allocationMap.get(c.id!);
  return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? safeNumber(c.rent_amount) : 0));
}, 0);
```

### 3. `CollectionReport.tsx` سطر 152 — إصلاح `0 >= 0`

عندما لا يوجد تخصيص للعقد في هذه السنة (`allocatedPayments === 0`)، لا ينبغي اعتباره "مكتمل". الحل: تصفية العقود التي ليس لها تخصيص أصلاً، أو إضافة شرط:

```typescript
// قبل
if (paid >= allocatedPayments) status = 'complete';

// بعد — عقد بدون تخصيص في هذه السنة لا يُعتبر مكتملاً
if (allocatedPayments > 0 && paid >= allocatedPayments) status = 'complete';
else if (allocatedPayments === 0 && paid === 0) status = 'not_started';
```

### 4. توثيق fallback "جميع السنوات"

إضافة تعليق توضيحي في كلا الملفين على سطر `allocationMap.size === 0`:
```typescript
// allocationMap.size === 0 يعني عرض "جميع السنوات" — نستخدم rent_amount الكامل كـ fallback
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/dashboard/PropertiesPage.tsx` | `activeIncome` بالتخصيص + تعليق |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | `activeIncome` بالتخصيص + تعليق |
| `src/components/contracts/CollectionReport.tsx` | إصلاح شرط `0 >= 0` |

**ملاحظة:** `useContractAllocationMap.ts` موجود فعلاً (ظاهر في الـ diff الأخير) — عدم ظهوره في البحث قد يكون بسبب تأخر الفهرسة.

