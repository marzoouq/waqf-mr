

# خطة تنفيذ توصيات الفحص الجنائي النهائي

## التغييرات المُعتمدة (5 بنود)

### 1. استخراج `ChartBox` كمكون مشترك
**ملف جديد:** `src/components/common/ChartBox.tsx`

مكون موحّد يدعم جميع الحالات الست:
```typescript
interface ChartBoxProps {
  height?: number | string;  // default: 300
  className?: string;
  fallback?: string;
  children: React.ReactNode;
}
```

- `height: number` → يُطبّق كـ `style={{ height }}`
- `height: string` → يُطبّق كـ `className` (مثل `h-[280px]`)
- `fallback` → نص بديل أثناء التحميل (مستخدم في `FinancialChartsInner` فقط)

**الملفات المُعدَّلة (6):**
| الملف | التغيير |
|-------|---------|
| `DashboardChartsInner.tsx` | حذف ChartBox المحلي، استيراد من common |
| `WaqifChartsInner.tsx` | حذف ChartBox المحلي، استيراد من common |
| `ReportsChartsInner.tsx` | حذف ChartBox المحلي، استيراد من common |
| `MonthlyPerformanceChartsInner.tsx` | حذف ChartBox المحلي، استيراد من common (height string → className) |
| `FinancialChartsInner.tsx` | حذف ChartBox المحلي، استيراد من common |
| `YoYChartsSectionInner.tsx` | حذف ChartBox المحلي، استيراد من common |

### 2. حذف `html2canvas`
حذف السطر من `package.json` dependencies. لا يوجد أي استيراد في الكود.

### 3. تطبيق `ViewportRender` على صفحة التقارير
**الملف:** `src/pages/dashboard/ReportsPage.tsx`

لف تبويبات التقارير الثقيلة (المخططات، التقرير السنوي) بـ `ViewportRender` لتأجيل رسمها حتى تظهر في نافذة العرض.

### 4. تطبيق `VirtualTable` على جدول العقود
**الملف:** المكون الذي يعرض جدول العقود (desktop) — استبدال `<table>` بـ `VirtualTable` عند تجاوز 50 صف.

### 5. دمج `useFinancialSummary` في `useReportsData`
**الملفات:**
- `useReportsData.ts` — استبدال `useFinancialSummary(...)` باستدعاء `useRawFinancialData` + `useComputedFinancials` مباشرة
- `useFinancialSummary.ts` — حذف الملف (لم يعد مُستخدماً)
- `useFinancialSummary.test.ts` — نقل الاختبارات إلى `useComputedFinancials.test.ts` أو حذفها
- `src/hooks/financial/index.ts` — حذف تصدير `useFinancialSummary`

---

## ترتيب التنفيذ
1. **ChartBox** — استخراج المكون المشترك + تحديث 6 ملفات
2. **html2canvas** — حذف من package.json
3. **useFinancialSummary** — دمج + حذف
4. **ViewportRender** — صفحة التقارير
5. **VirtualTable** — جدول العقود

