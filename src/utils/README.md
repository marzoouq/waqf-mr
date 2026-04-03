# src/utils/

دوال مساعدة نقية (pure helper functions) لا تحتفظ بحالة.

## القاعدة
ضع هنا **دوال نقية** قابلة للاختبار بسهولة:
- تنسيق البيانات (format, maskData, safeNumber)
- تحويل الملفات (csv, xlsx)
- حسابات مالية (dashboardComputations, contractAllocation)
- توليد PDF (pdf/) — **تُرجع Blob/نتيجة فقط، بدون رفع أو إشعارات**
- تشخيصات (diagnostics/) — تستخدم `lib/services/diagnosticsService.ts` للاستعلامات

## الفرق عن `src/lib/`
- **`utils/`**: دوال نقية، بدون حالة، بدون اعتماد على مكتبات بنية تحتية
- **`lib/`**: بنية تحتية ذات حالة (logger, queryClient, performance monitors)

## ممنوعات في هذا المجلد
- ❌ استيراد `toast` من `sonner` — أرجع نتيجة (success/error) واترك الطبقة المستدعية تُشعر المستخدم
- ❌ استيراد `supabase` مباشرة — استخدم `lib/services/` للاستعلامات
- ❌ تعديل قاعدة البيانات أو رفع ملفات — هذه مسؤولية `lib/services/`
