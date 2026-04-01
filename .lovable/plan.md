

# إصلاح حلقة reload اللانهائية في `pwaBootstrap.ts`

## المشكلة

عند كل build جديد في بيئة Preview، يتغير `APP_BUILD_ID` → الشرط في سطر 19 يتحقق → يُعاد التحميل → build جديد → `APP_BUILD_ID` مختلف → reload مجدداً = **حلقة لا نهائية**.

نفس المشكلة في المسار غير-Preview (سطر 35-53): إذا تغير الـ ID بين كل reload.

## الإصلاح

إضافة حارس زمني في `sessionStorage` يمنع أكثر من reload واحد كل 10 ثوانٍ. إذا حدث reload قريب، يتم تخطّي إعادة التحميل وتسجيل تحذير فقط.

### التغييرات — ملف واحد: `src/lib/pwaBootstrap.ts`

1. إضافة ثابت `RELOAD_GUARD_KEY = 'pwa_reload_ts'` و `RELOAD_COOLDOWN = 10_000`
2. إنشاء دالة مساعدة `canReload()`:
   - تقرأ `sessionStorage.getItem(RELOAD_GUARD_KEY)`
   - إذا كان الفرق عن `Date.now()` أقل من 10 ثوانٍ → ترجع `false`
   - وإلا → تحفظ الوقت الحالي وترجع `true`
3. استبدال كل `window.location.reload()` (سطران: 27 و 53) بـ:
   ```typescript
   if (canReload()) {
     window.location.reload();
   } else {
     logger.warn('[PWA] تم تخطي reload لمنع حلقة لا نهائية');
   }
   ```

لا تغييرات على ملفات أخرى.

