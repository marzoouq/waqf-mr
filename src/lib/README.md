# src/lib/

البنية التحتية والخدمات المشتركة التي يعتمد عليها التطبيق بأكمله.

## القاعدة
ضع هنا الكود الذي يوفر **بنية تحتية** أو **خدمات مشتركة** (وليس دوال مساعدة نقية):
- إعداد مكتبات (queryClient, logger)
- مراقبة الأداء (performanceMonitor, pagePerformanceTracker)
- أنظمة التحميل (lazyWithRetry, componentPrefetch)
- تعريفات الثيمات (theme/)
- خدمات قاعدة البيانات والتخزين (services/)
- إشعارات موحّدة (notify.ts)
- منطق المصادقة (auth/)

## الفرق عن `src/utils/`

| الخاصية | `lib/` | `utils/` |
|---------|--------|----------|
| **النوع** | بنية تحتية ذات حالة | دوال نقية (pure functions) |
| **الحالة** | قد تحتفظ بحالة (stateful) | بدون حالة (stateless) |
| **الآثار الجانبية** | مسموحة (Supabase, Auth, Storage) | ممنوعة |
| **الاختبار** | يحتاج mocks للخدمات الخارجية | سهل — مدخلات ومخرجات |
| **أمثلة** | `logger`, `queryClient`, `supabase client` | `format()`, `calculateDistributions()` |

## `lib/services/`
خدمات تتفاعل مع قاعدة البيانات والتخزين:
- `invoiceStorageService.ts` — رفع ملفات PDF وتحديث file_path
- `diagnosticsService.ts` — استعلامات تشخيصية مجردة
- `fiscalYearService.ts` — عمليات السنة المالية
- `notificationService.ts` — إشعارات المستخدمين
- `zatcaService.ts` — عمليات ZATCA
- `dataFetcher.ts` — جلب بيانات الجداول للتصدير (Supabase مباشر)
