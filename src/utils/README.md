# src/utils/

دوال مساعدة نقية (pure helper functions) لا تحتفظ بحالة.

## القاعدة
ضع هنا **دوال نقية** قابلة للاختبار بسهولة:
- تنسيق البيانات (format, maskData, safeNumber)
- تحويل الملفات (csv, xlsx)
- حسابات مالية (dashboardComputations, contractAllocation, distributionCalcPure)
- توليد PDF (pdf/) — **تُرجع Blob/نتيجة فقط، بدون رفع أو إشعارات**
- تشخيصات (diagnostics/) — تستخدم `lib/services/diagnosticsService.ts` للاستعلامات

## الفرق عن `src/lib/`

| الخاصية | `utils/` | `lib/` |
|---------|----------|--------|
| **النوع** | دوال نقية (pure functions) | بنية تحتية ذات حالة |
| **الحالة** | بدون حالة (stateless) | قد تحتفظ بحالة (stateful) |
| **الآثار الجانبية** | ممنوعة | مسموحة (Supabase, Auth, Storage) |
| **الاختبار** | سهل — مدخلات ومخرجات | يحتاج mocks للخدمات الخارجية |
| **أمثلة** | `format()`, `calculateDistributions()` | `logger`, `queryClient`, `supabase client` |

## ممنوعات في هذا المجلد
- ❌ استيراد `toast` من `sonner` — أرجع نتيجة (success/error) واترك الطبقة المستدعية تُشعر المستخدم
- ❌ استيراد `supabase` مباشرة — استخدم `lib/services/` للاستعلامات
- ❌ تعديل قاعدة البيانات أو رفع ملفات — هذه مسؤولية `lib/services/`
