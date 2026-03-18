

# خطة إصلاح توافق الجوال — المشاكل عالية ومتوسطة الأولوية

## الملخص
10 مكونات/صفحات تحتاج إصلاح توافق الجوال. سأركز على الأولوية العالية والمتوسطة (7 ملفات).

---

## 🔴 أولوية عالية

### 1. `HistoricalComparisonPage.tsx`
- الجدول (سطر 209) بدون `overflow-x-auto` وبدون mobile cards
- **الإصلاح**: لف الجدول بـ `overflow-x-auto hidden md:block` + إضافة mobile cards بنمط بطاقات تعرض المؤشر وقيم السنوات

### 2. `PendingActionsTable.tsx`
- جدول الإجراءات المعلقة في الداشبورد الرئيسي بدون عرض mobile
- **الإصلاح**: إضافة عرض بطاقات `md:hidden` فوق الجدول + إخفاء الجدول بـ `hidden md:block`

### 3. `SupportPage.tsx` (المستفيد)
- جدول التذاكر (سطر 70) بدون `overflow-x-auto` وبدون mobile cards
- **الإصلاح**: إضافة بطاقات mobile تعرض رقم التذكرة والعنوان والحالة والتاريخ + إخفاء الجدول على الجوال

---

## 🟡 أولوية متوسطة

### 4. `AnnualReportPage.tsx` + `AnnualReportViewPage.tsx`
- `TabsList` يحتوي `overflow-x-auto` لكن بدون `flex-nowrap` — التبويبات قد تتكسر على الجوال
- **الإصلاح**: إضافة `flex-nowrap` على `TabsList` + تصغير النص بـ `text-xs sm:text-sm` + `whitespace-nowrap` على كل `TabsTrigger`

### 5. `ChartOfAccountsPage.tsx`
- شجرة الحسابات تستخدم `Collapsible` وليس جدولاً تقليديًا — المشكلة أخف
- **الإصلاح**: التأكد من padding وحجم الخط مناسبين على الجوال + إضافة `overflow-x-auto` إن لزم

### 6. `AccountsExpensesTable.tsx`
- يحتوي `overflow-x-auto` فعلاً — مقبول لجدول بعمودين فقط (النوع + المبلغ)
- **الإصلاح**: لا يحتاج mobile cards لأن العمودين يتسعان — فقط التأكد من `min-w` مناسب

---

## النهج التقني
- استخدام نمط `md:hidden` (mobile cards) + `hidden md:block` (desktop table) المتبع في باقي التطبيق
- الاستفادة من مكون `MobileCardView` الموجود حيث يناسب
- للجداول البسيطة: بطاقات inline بسيطة بدلاً من `MobileCardView` الكامل

## الملفات المتأثرة
1. `src/pages/dashboard/HistoricalComparisonPage.tsx`
2. `src/components/dashboard/PendingActionsTable.tsx`
3. `src/pages/beneficiary/SupportPage.tsx`
4. `src/pages/dashboard/AnnualReportPage.tsx`
5. `src/pages/beneficiary/AnnualReportViewPage.tsx`
6. `src/pages/dashboard/ChartOfAccountsPage.tsx` (تحسين طفيف)

