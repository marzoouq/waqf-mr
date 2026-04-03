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
- **`lib/`**: بنية تحتية، قد تحتفظ بحالة (state)، تتفاعل مع خدمات خارجية (Supabase, Auth, Storage)
- **`utils/`**: دوال مساعدة نقية (pure functions)، بدون حالة، بدون آثار جانبية، قابلة للاختبار بسهولة

## `lib/services/`
خدمات تتفاعل مع قاعدة البيانات والتخزين:
- `invoiceStorageService.ts` — رفع ملفات PDF وتحديث file_path
- `diagnosticsService.ts` — استعلامات تشخيصية مجردة
- `fiscalYearService.ts` — عمليات السنة المالية
- `notificationService.ts` — إشعارات المستخدمين
- `zatcaService.ts` — عمليات ZATCA
