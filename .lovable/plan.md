

# خطة إيقاف الإشعارات المنبثقة (Toast Notifications) عند الدخول

## المشكلة

عند فتح التطبيق تظهر إشعارات منبثقة مزعجة من مصدرين:

1. **مراقبة أداء الاستعلامات** (`initQueryMonitoring.ts`): تُظهر toast تحذيري عند أي استعلام يتجاوز 5 ثوانٍ (مثل "dashboard-summary استغرقت 8.1 ثانية")
2. **التنبيهات الحية** (`useRealtimeAlerts.ts`): تُظهر toast عند إضافة/تعديل تذاكر دعم أو عقود

المطلوب: إيقاف جميع هذه الإشعارات المنبثقة والاكتفاء بلوحة الأداء الداخلية في صفحة تشخيص النظام.

## التعديلات

### 1. إيقاف toast الاستعلامات البطيئة

**ملف:** `src/lib/initQueryMonitoring.ts`
- إزالة `import { defaultNotify }` 
- إزالة `onSlow` callback من `startPerfTimer` — الاستعلامات البطيئة تبقى مُسجّلة في `logger.warn` وفي `recentSlowQueries` (تظهر في لوحة تشخيص النظام) لكن بدون toast

### 2. إيقاف التنبيهات الحية (Realtime Alerts)

**ملف:** `src/hooks/ui/useLayoutState.ts`
- إزالة استدعاء `useRealtimeAlerts(navigate)` — هذا يوقف الاشتراك بالكامل فلا تظهر أي إشعارات حية

### الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/lib/initQueryMonitoring.ts` | إزالة `defaultNotify` و `onSlow` |
| `src/hooks/ui/useLayoutState.ts` | إزالة `useRealtimeAlerts` |

### ما يبقى يعمل

- لوحة الأداء في صفحة تشخيص النظام (تقرأ من `getSlowQueries()` و `getVitalsSnapshot()`)
- تسجيل الاستعلامات البطيئة في `logger.warn` (للمراجعة في Console)
- إشعارات الأخطاء الفعلية من `queryClient` (عند فشل حفظ بيانات) — هذه ضرورية وتبقى

