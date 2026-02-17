

# خطة إضافة اختبارات لمكونات ExportMenu و FiscalYearSelector و NotificationBell

## الملفات الجديدة

### 1. `src/components/ExportMenu.test.tsx` (6 اختبارات)
- عرض زر التصدير الافتراضي مع القائمة المنسدلة (طباعة + PDF)
- عند إخفاء الطباعة (`hidePrint=true`) يظهر زر PDF فقط بدون قائمة
- عند إخفاء PDF (`hidePdf=true`) يظهر زر الطباعة فقط بدون قائمة
- النقر على "طباعة" يستدعي `onPrint` callback
- النقر على "تصدير PDF" يستدعي `onExportPdf` callback
- عند عدم تمرير `onPrint` يستدعي `window.print()` كبديل

### 2. `src/components/FiscalYearSelector.test.tsx` (5 اختبارات)
- Mock لـ `useFiscalYears` لإرجاع بيانات وهمية
- عرض خيار "جميع السنوات" عند `showAll=true`
- إخفاء "جميع السنوات" عند `showAll=false`
- عرض شارة "نشطة" للسنة المالية النشطة
- عدم عرض أي شيء أثناء التحميل (`isLoading=true`)

### 3. `src/components/NotificationBell.test.tsx` (5 اختبارات)
- Mock لـ `useNotifications` لإرجاع بيانات وهمية
- عرض أيقونة الجرس بدون عداد عندما لا توجد إشعارات غير مقروءة
- عرض عداد الإشعارات غير المقروءة
- عرض "9+" عندما يتجاوز العدد 9
- عرض رسالة "لا توجد إشعارات" عند فتح القائمة بدون إشعارات

## التفاصيل التقنية

- جميع الاختبارات تستخدم `vi.mock` لعزل التبعيات الخارجية (hooks, supabase)
- تُستخدم `@testing-library/react` للعرض والتفاعل
- الإجمالي المتوقع بعد الإضافة: **~175 اختبار**

