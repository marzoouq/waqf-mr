

# خطة توحيد تنسيق الأرقام المالية — المرحلة صفر

## الملخص

توحيد جميع الأرقام المالية على تنسيق لاتيني `16,666.67` عبر إنشاء `src/utils/format.ts` مركزي، وتطبيقه أولاً على صفحات المستفيد (5 ملفات). التواريخ تبقى كما هي.

## المرحلة صفر — إنشاء الدالة المركزية + صفحات المستفيد

### 1. إنشاء `src/utils/format.ts`

```ts
export const fmt = (n: number | null | undefined, decimals = 2): string => {
  const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
export const fmtInt = (n: number | null | undefined) => fmt(n, 0);
export const fmtSAR = (n: number | null | undefined, decimals = 2) => `${fmt(n, decimals)} ر.س`;
export const fmtPct = (n: number | null | undefined, decimals = 2) => `${fmt(n, decimals)}%`;
```

### 2. تحديث الملفات (المرحلة صفر — 5 ملفات)

| الملف | التغيير |
|-------|---------|
| `MySharePage.tsx` | حذف `fmtAr` المحلية، import `fmt`/`fmtSAR` من format.ts، استبدال كل `.toLocaleString()` و `fmtAr()` |
| `BeneficiaryDashboard.tsx` | حذف `fmtAr` المحلية، import واستبدال |
| `DisclosurePage.tsx` | استبدال كل `.toLocaleString()` بـ `fmt()` |
| `CarryforwardHistoryPage.tsx` | استبدال `.toLocaleString('ar-SA')` بـ `fmt()` |
| `AccountsViewPage.tsx` | استبدال `.toLocaleString()` بـ `fmt()` |

### 3. ملفات الطباعة المرتبطة بالمستفيد

| الملف | التغيير |
|-------|---------|
| `printShareReport.ts` | استبدال `.toLocaleString()` بـ `fmt()` |

## المراحل القادمة (ليست في هذا الـ PR)

- **المرحلة 1**: لوحة الناظر — AdminDashboard, ReportsPage, AccountsSummaryCards, DistributeDialog, CloseYearDialog, وباقي مكونات الحسابات
- **المرحلة 2**: PDF والطباعة — pdf/reports.ts, pdf/comprehensiveBeneficiary.ts, pdf/expenses.ts, printDistributionReport.ts, ai-assistant

## قرارات التنسيق

- `fmt(n)` → `"16,666.67"` (en-US مع كسرين)
- `fmtSAR(n)` → `"16,666.67 ر.س"`
- `fmtInt(n)` → `"16,667"` (بدون كسور — لعدد العقود/الوحدات)
- التواريخ **لا تتغير** في هذه المرحلة

