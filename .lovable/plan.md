

## تحسين ErrorBoundary — رسالة مخصصة لأخطاء تحميل الملفات (Chunk Errors)

### التعديل — ملف واحد: `src/components/ErrorBoundary.tsx`

**الفكرة:** كشف ما إذا كان الخطأ من نوع chunk loading (`Failed to fetch dynamically imported module` أو `Loading chunk`) وعرض رسالة مختلفة مع زر "تحديث التطبيق" بدلاً من الرسالة العامة.

### التغييرات:

1. **إضافة دالة `isChunkError`** — تفحص رسالة الخطأ للتعرف على أخطاء chunk
2. **إضافة أيقونة `RefreshCw`** من lucide-react لزر التحديث
3. **تفريع واجهة العرض في `render`**:
   - **إذا كان chunk error**: عنوان "يوجد تحديث جديد للتطبيق"، وصف يشرح أن نسخة جديدة متاحة، وزر "تحديث التطبيق" يمسح كاش `static-assets` ويعيد تحميل الصفحة
   - **غير ذلك**: الرسالة الحالية كما هي
4. **دالة `handleForceRefresh`** — تمسح كاش الأصول وتعيد تحميل الصفحة بـ `location.reload()`

