

# خطة إضافة اختبارات وحدة للهوكات المُعدّلة

## الملفات المستهدفة

### 1. `src/hooks/page/useSupportDashboardPage.test.ts` (جديد)
اختبار المنطق المحسوب في الهوك مع mock لجميع الاعتماديات:

- **فلترة التذاكر**: فلتر التصنيف، البحث النصي (عنوان/رقم/وصف)، الجمع بينهما
- **فلترة الأخطاء**: بحث بالمسار، اسم الخطأ، رسالة الخطأ
- **categoryStats**: حساب النسب المئوية، التعامل مع بيانات فارغة
- **priorityStats**: ربط التسميات والألوان، حساب النسب
- **avgResolutionTime**: تحويل دقائق/ساعات/أيام حسب القيمة
- **avgRating**: التعامل مع وجود/عدم وجود تقييمات
- **PRIORITY_MAP / STATUS_MAP / CATEGORY_MAP**: صحة القيم المصدّرة

### 2. `src/hooks/data/useSupportTickets.test.ts` (جديد)
اختبار الهوكات مع mock لـ Supabase:

- **useSupportTickets**: بناء الاستعلام مع فلتر الحالة و pagination
- **useSupportAnalytics**: استدعاء RPC الصحيح وتحويل النتيجة
- **fetchTicketsForExport**: الأعمدة المحددة والترتيب والحد

## النهج التقني

- Mock لـ `@/integrations/supabase/client` و `@/contexts/AuthContext` و `@/hooks/auth/useAuthContext`
- استخدام `renderHook` من `@testing-library/react` مع `QueryClientProvider`
- اختبار المنطق الصافي (فلترة، حسابات إحصائية) عبر تمرير بيانات mock للهوكات
- ~25 حالة اختبار تغطي الحالات العادية والحدودية

## تقدير الحجم
- ملفان جديدان
- ~300 سطر إجمالي

