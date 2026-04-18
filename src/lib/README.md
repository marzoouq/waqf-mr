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

## متى أضع الكود في `lib/`؟ (شجرة قرار)

اسأل نفسك بالترتيب:

1. **هل يستورد `supabase` / `Storage` / `Auth`؟** → `lib/` (غالباً `lib/services/`)
2. **هل يستدعي `toast` من `sonner`؟** → `lib/` (أو استخدم `lib/notify.ts`)
3. **هل يحتاج singleton أو initialization (queryClient, logger, monitor)؟** → `lib/`
4. **هل يحتفظ بحالة عبر استدعاءات (cache, listener, subscription)؟** → `lib/`
5. **مدخل ثابت يُنتج مخرج ثابت بدون آثار جانبية؟** → `utils/` (انظر `src/utils/README.md`)

## الفرق عن `src/utils/`

| الخاصية | `lib/` | `utils/` |
|---------|--------|----------|
| **النوع** | بنية تحتية ذات حالة | دوال نقية (pure functions) |
| **الحالة** | قد تحتفظ بحالة (stateful) | بدون حالة (stateless) |
| **الآثار الجانبية** | مسموحة (Supabase, Auth, Storage, toast) | ممنوعة |
| **الاختبار** | يحتاج mocks للخدمات الخارجية | سهل — مدخلات ومخرجات |
| **أمثلة** | `logger`, `queryClient`, `notify` | `format()`, `calculateDistributions()` |

## التقسيمات الفرعية

### `lib/services/` — تفاعل مباشر مع DB/Storage
- `invoiceStorageService.ts` — رفع ملفات PDF وتحديث file_path
- `diagnosticsService.ts` — استعلامات تشخيصية مجردة
- `fiscalYearService.ts` — عمليات السنة المالية
- `notificationService.ts` — إشعارات المستخدمين
- `zatcaService.ts` — عمليات ZATCA
- `dataFetcher.ts` — جلب بيانات الجداول للتصدير
- `accessLogService.ts` — تسجيل أحداث الوصول

استخدمها من `hooks/data/` و Edge Functions wrappers.

### `lib/realtime/` — اشتراكات Supabase Realtime
channels و subscription managers — تحتفظ بحالة الاتصال وتدير cleanup.

### `lib/auth/` — منطق المصادقة على مستوى البنية
helpers تُستخدم من `AuthContext` و Edge Functions client wrappers — ليست hooks (تلك في `hooks/auth/`).

### `lib/notify.ts` — نمط الإشعارات الموحّد
استخدمه بدلاً من استيراد `toast` مباشرة من `sonner`. يضمن:
- نصوص عربية موحّدة
- أنواع إشعارات قياسية (success/error/warning/info)
- سهولة استبدال المكتبة لاحقاً

```ts
// ✅ صحيح
import { notify } from '@/lib/notify';
notify.success('تم الحفظ');

// ❌ خطأ في utils/ أو hooks/data/
import { toast } from 'sonner';
toast.success('تم الحفظ');
```
