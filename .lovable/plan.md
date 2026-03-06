

# خطة: تحسينات إمكانية الوصول + MobileCardView

## القرار
**التاريخ الهجري لن يُضاف** — النظام بالكامل يعمل بالتقويم الميلادي فقط (مع لاحقة 'م') لتوحيد التجربة ومنع الارتباك.

## التغييرات المطلوبة (3 ملفات)

### 1. `src/components/TablePagination.tsx`
- إضافة `aria-label="الصفحة السابقة"` و `"الصفحة التالية"` لأزرار التنقل
- إضافة `aria-label` لأزرار الأرقام
- تغيير الحاوية إلى `flex-col sm:flex-row` مع `gap-2`

### 2. `src/pages/dashboard/MessagesPage.tsx`
- إضافة `aria-label="إرسال الرسالة"` لزر الإرسال
- إضافة `Loader2 animate-spin` أثناء `sendMessage.isPending`

### 3. `src/components/MobileCardView.tsx`
- إضافة `isLoading?: boolean` و `skeletonCount?: number` للـ props
- عرض بطاقات Skeleton عند `isLoading`
- إضافة `aria-label` لأزرار التعديل والحذف

