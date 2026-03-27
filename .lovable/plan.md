

## إصلاح البقايا المتبقية

### 1. استبدال `staleTime` الحرفية بالثوابت المركزية

**3 ملفات — تغيير بسيط في كل منها:**

| الملف | السطر | من | إلى |
|-------|-------|----|-----|
| `src/hooks/data/useUnits.ts` | 45 | `staleTime: 60_000` | `staleTime: STALE_FINANCIAL` |
| `src/hooks/data/useTenantPayments.ts` | 41 | `staleTime: 60_000` | `staleTime: STALE_FINANCIAL` |
| `src/hooks/financial/useContractAllocations.ts` | 33 | `staleTime: 60_000` | `staleTime: STALE_FINANCIAL` |

كل ملف يحتاج إضافة `import { STALE_FINANCIAL } from '@/lib/queryStaleTime';` في الأعلى.

---

### 2. استبدال `tooltipStyle` المحلية بـ `tooltipStyleRtl` من `chartHelpers`

**3 ملفات — حذف التعريف المحلي + إضافة import:**

| الملف | التغيير |
|-------|---------|
| `src/components/reports/ReportsChartsInner.tsx` | حذف سطر 13 (`const tooltipStyle = ...`)، إضافة `import { tooltipStyleRtl } from '@/utils/chartHelpers'`، استبدال `tooltipStyle` → `tooltipStyleRtl` في سطور 33، 48 |
| `src/components/reports/YoYChartsSectionInner.tsx` | حذف سطر 12 (`const tooltipStyle = ...`)، إضافة `import { tooltipStyleRtl } from '@/utils/chartHelpers'`، استبدال `tooltipStyle` → `tooltipStyleRtl` في سطور 45، 67، 96، 122 |
| `src/components/reports/MonthlyPerformanceChartsInner.tsx` | حذف سطر 11 (`const tooltipStyle = ...`)، إضافة `import { tooltipStyleRtl } from '@/utils/chartHelpers'`، استبدال `tooltipStyle` → `tooltipStyleRtl` في سطور 39، 68 |

---

### الملخص
- **6 ملفات** تحتاج تعديل
- **0 ملفات جديدة**
- تغييرات ميكانيكية بحتة — لا تغيير في السلوك

