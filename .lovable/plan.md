

# خطة: إكمال lazy-load لـ recharts في لوحة التحكم

## الوضع الحالي

بعد فحص شامل لصفحتي العقود والفواتير:
- **لا توجد مشاكل عرض في الكود** — الصفحتان تتضمنان عرض جدولي وكروت للموبايل، pagination، فلترة، وبحث بشكل سليم
- **Prefetch موجود ومُفعّل** في Sidebar (سطر 79) عبر `onMouseEnter` ✅
- **المشكلة الوحيدة المتبقية**: `AdminDashboard.tsx` سطر 14 يستورد `recharts` مباشرة (`PieChart, Pie, Cell, Tooltip, ResponsiveContainer`) لرسم "ملخص التحصيل" — هذا يُبطل فائدة lazy-load لأن recharts يدخل في الحزمة الأولية

## التعديل المطلوب

**ملف واحد:** `src/pages/dashboard/AdminDashboard.tsx`

1. إزالة استيراد `recharts` المباشر من سطر 14
2. نقل مكوّن "ملخص التحصيل" (mini PieChart، سطور 329-351) إلى مكوّن منفصل `CollectionSummaryChart` داخل `DashboardCharts.tsx` أو ملف جديد
3. تحميل هذا المكوّن عبر `React.lazy` مثل بقية الرسوم

**النتيجة**: حزمة `recharts` (~250KB) تُحمّل فقط عند الوصول لمنطقة الرسوم البيانية، مما يُحسّن زمن التحميل الأولي.

## ملاحظة حول المرحلة 1

قرار الإبقاء على `useContractsByFiscalYear('all')` في `useAccountsPage` **صحيح معمارياً** — `allocationMap` يحتاج كل العقود عبر كل السنوات لحساب التوزيع الزمني. الكاش موحّد مع Dashboard عبر نفس query key.

