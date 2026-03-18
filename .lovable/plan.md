

# خطة إصلاح المشاكل المتبقية

بعد مراجعة الكود الحالي، تبيّن أن الإصلاحات السابقة غطّت SupportPage وHistoricalComparisonPage وPendingActionsTable بنجاح. المشاكل المتبقية:

---

## 1. `CarryforwardHistoryPage.tsx` — mobile cards لجدولين

**جدول الترحيلات (سطر 186)**: 6 أعمدة بـ `overflow-x-auto` فقط — يحتاج mobile cards تعرض: المبلغ، الحالة، من/إلى سنة، التاريخ، الملاحظات.

**جدول السُلف (سطر 235)**: 4 أعمدة — يحتاج mobile cards تعرض: المبلغ، السبب، تاريخ الصرف.

**تحسين إضافي**: تغيير بطاقات الملخص (سطر 127) من `grid-cols-1 sm:grid-cols-2` إلى `grid-cols-2 lg:grid-cols-4` لاستغلال المساحة أفضل على الجوال.

## 2. `SupportPage.tsx` — نجوم التقييم لا تعمل على الجوال

**السطر 274-289**: أزرار النجوم تعتمد على `onMouseEnter/onMouseLeave` فقط — لا يوجد دعم touch.

**الإصلاح**: إضافة `onTouchStart` لتفعيل hover effect على اللمس.

## 3. `ChartOfAccountsPage.tsx` — paddingRight يكسر الجوال

**السطر 77**: `paddingRight: 12 + depth * 24` — عند depth=3 يصبح 84px مما يكسر layout على 360px.

**الإصلاح**: تقليل المضاعف إلى `depth * 16` مع حد أقصى `Math.min(..., 64)` + إخفاء كود الحساب على الشاشات الصغيرة جداً + تحويل الصف لـ `flex-wrap` على الجوال.

## 4. `HistoricalComparisonPage.tsx` — الرسم البياني

**السطر 284-288**: `YAxis width={100}` يأخذ 28% من عرض 360px.

**الإصلاح**: تقليل `width` إلى 70 وتصغير `fontSize` + تقليل `height` من 350 إلى 280 على الجوال.

---

## الملفات المتأثرة
1. `src/pages/beneficiary/CarryforwardHistoryPage.tsx` (mobile cards + grid fix)
2. `src/pages/beneficiary/SupportPage.tsx` (touch support للنجوم)
3. `src/pages/dashboard/ChartOfAccountsPage.tsx` (padding cap + responsive)
4. `src/pages/dashboard/HistoricalComparisonPage.tsx` (chart sizing)

