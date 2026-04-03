

# خطة تحسين الأداء — 6 إصلاحات جذرية

## الإصلاحات المطلوبة

### 1. استبعاد الحزم الثقيلة من PWA Precache (تأثير عالي)
**الملف**: `vite.config.ts`
- إضافة `globIgnores` لاستبعاد: `vendor-pdf`, `vendor-recharts`, `vendor-html2canvas`, `vendor-markdown`, `vendor-dnd` من precache
- هذه الحزم ستُحمّل عند الطلب فقط عبر `runtimeCaching` (StaleWhileRevalidate)
- التوفير: ~1,257 KB (-26% من precache)

### 2. Lazy loading لتبويبات الإعدادات (تأثير متوسط-عالي)
**الملف**: `src/pages/dashboard/SettingsPage.tsx`
- تحويل `WaqfSettingsTab`, `AppearanceTab`, `NotificationsTab`, `SecurityTab` من استيراد مباشر (سطر 9) إلى `lazy()`
- التوفير: ~24 KB من حزمة index (-19%)

### 3. تقليل تأخيرات DeferredRender (تأثير متوسط)
**الملف**: `src/pages/dashboard/AdminDashboard.tsx`
- تغيير التأخيرات من `(1500, 2000, 2500, 3000, 3500)` إلى `(300, 500, 700, 900, 1100)`
- `requestIdleCallback` يتكفل بالتوقيت الذكي — timeout القصير يسمح بعرض أسرع

### 4. Debounce على Realtime Invalidation (تأثير متوسط)
**الملف**: `src/hooks/ui/useDashboardRealtime.ts`
- إضافة debounce 500ms قبل `invalidateQueries`
- يجمّع التغييرات المتزامنة في إبطال واحد بدلاً من إبطال لكل صف

### 5. Throttle على Sidebar hover prefetch (تأثير منخفض-متوسط)
**الملف**: `src/hooks/data/usePrefetchPages.ts`
- إضافة throttle 300ms على `getPrefetchHandler` لمنع 10+ طلبات متزامنة عند التمرير السريع

### 6. Cache-Control header لـ dashboard-summary (تأثير منخفض)
**الملف**: `supabase/functions/dashboard-summary/index.ts`
- إضافة `"Cache-Control": "private, max-age=60"` في `jsonHeaders` (سطر 37)
- يمنع إعادة الجلب عند F5 خلال 60 ثانية

---

## التأثير المتوقع

```text
مقياس               │  الحالي    │  بعد الإصلاح
─────────────────────┼────────────┼────────────────────
PWA precache         │  4,900 KB  │  ~3,650 KB (-26%)
حزمة index           │  129 KB    │  ~105 KB (-19%)
أول ظهور للمحتوى     │  3.5s      │  ~1.5s (-57%)
طلبات شبكة/ثانية     │  غير محدود │  debounced+throttled
```

