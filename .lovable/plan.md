

# إصلاح تحذيرات Recharts المتبقية — ملفان إضافيان

## المشكلة
التحذير `width(-1) and height(-1)` لا يزال يظهر. بعد فحص جميع ملفات المشروع، تبيّن وجود **ملفين** لم يُصلحا في الجولات السابقة.

## الملفات والتغييرات

| # | الملف | المواقع | التغيير |
|---|-------|---------|---------|
| 1 | `src/components/reports/MonthlyPerformanceReport.tsx` | سطر 135، 164 | إضافة `minHeight={1}` |
| 2 | `src/components/reports/ReportsChartsInner.tsx` | سطر 26، 43 | إضافة `minWidth={1} minHeight={1}` |

### أمثلة

**MonthlyPerformanceReport.tsx** (سطر 135):
```tsx
// قبل
<ResponsiveContainer width="100%" height="100%" minWidth={1}>
// بعد
<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
```

**ReportsChartsInner.tsx** (سطر 26):
```tsx
// قبل
<ResponsiveContainer width="100%" height={300}>
// بعد
<ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
```

## الحالة الكاملة بعد الإصلاح
جميع 19 `ResponsiveContainer` في المشروع ستحتوي على `minWidth={1} minHeight={1}` — لن يتبقى أي مصدر للتحذير.

