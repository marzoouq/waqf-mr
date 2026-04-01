

# إصلاح `width(-1) height(-1)` — تطبيق `useChartReady` على 3 مكوّنات

## المشكلة
3 مكوّنات رسوم بيانية تستخدم `ResponsiveContainer` بدون `useChartReady`، مما يسبب تحذير `width(-1) height(-1)` عند التحميل الكسول.

## الإصلاح

### 1. `DashboardChartsInner.tsx`
- استيراد `useChartReady`
- إنشاء مكوّن `ChartBox` محلي (نفس النمط المستخدم في `FinancialChartsInner`)
- لف كل `ResponsiveContainer` بـ `ChartBox`

### 2. `CashFlowChartInner.tsx`
- تحويل من arrow function إلى function component مع `useChartReady`
- لف `ResponsiveContainer` بحاوية `ref` + شرط `ready`

### 3. `ReportsChartsInner.tsx`
- نفس نمط `ChartBox` المحلي
- لف كلا الـ `ResponsiveContainer` (PieChart + BarChart) بـ `ChartBox`

## التفاصيل التقنية
- `useChartReady` موجود بالفعل في `src/hooks/ui/useChartReady.ts` — لا حاجة لإنشائه
- النمط مطبّق بنجاح في 6 مكوّنات أخرى — نطبق نفس الأسلوب
- لا تغيير في المنطق أو البيانات — فقط تأخير الرندر حتى تكتسب الحاوية أبعاداً فعلية

