# خطة: تفعيل التنظيف العميق في صفحة التشخيص

## الهدف
إضافة خيار "تنظيف عميق" يمسح الكاش وSW وIndexedDB غير الحرج، مع حماية كاملة لجلسة المستخدم وإعادة تحميل تلقائية بعد التنفيذ.

## الملفات الجديدة

### 1) `src/lib/diagnostics/deepClean.ts` (~120 سطر)
دالة `runDeepClean({ queryClient })` تُنفّذ بالترتيب وتُرجع `DeepCleanReport`:

```ts
type DeepCleanReport = {
  localStorageKeysCleared: number;
  sessionStorageKeysCleared: number;
  queryCacheCleared: boolean;
  indexedDbsDeleted: string[];
  serviceWorkersUnregistered: number;
  cachesDeleted: string[];
  errors: Array<{ step: string; message: string }>;
  durationMs: number;
};
```

**القائمة البيضاء للحماية (لا تُمسّ أبداً):**
- `localStorage`: كل مفاتيح `sb-*` (توكنات Supabase auth)، `theme`, `i18n*`
- `sessionStorage`: `fiscal_year_id` فقط
- `IndexedDB`: قواعد Supabase الداخلية (`supabase-auth-*`)، Firebase Messaging
- `Service Worker`: `firebase-messaging-sw.js` (سكوب `/firebase-cloud-messaging-push-scope`)
- `Cache Storage`: أي كاش يبدأ بـ `firebase-` أو `fcm-`

**الخطوات (متسلسلة مع try/catch لكل خطوة):**
1. مسح مفاتيح التشخيص من localStorage: `diagnostics_*`, `error_log_queue`, `dismissed_warnings`, `tickPoll_*`, `lovable-cache-*`
2. مسح sessionStorage مع الإبقاء على `fiscal_year_id`
3. `queryClient.clear()` ثم `queryClient.invalidateQueries()`
4. `indexedDB.databases()` ← حذف كل ما ليس في القائمة البيضاء (lovable-cache, localforage, keyval-store)
5. `navigator.serviceWorker.getRegistrations()` ← `unregister()` لكل تسجيل سكوبه `/` (تخطي firebase)
6. `caches.keys()` ← حذف `workbox-*`, `precache-*`, `runtime-*` (تخطي firebase/fcm)
7. إعادة ضبط بانر الإشعارات وtickPoll

### 2) `src/lib/diagnostics/deepClean.test.ts` (~80 سطر)
- يتحقق أن `sb-access-token` و`sb-refresh-token` محميان
- يتحقق أن `fiscal_year_id` لا يُمسح
- يتحقق أن SW الخاص بـ firebase لا يُلغى
- يتحقق أن كاش `firebase-*` لا يُحذف
- يتحقق سلوك try/catch — فشل خطوة لا يوقف البقية

## الملفات المُعدَّلة

### 3) `src/pages/dashboard/SystemDiagnosticsPage.tsx`
- استبدال زر "Clean" الحالي بـ `DropdownMenu` يحتوي:
  - **تنظيف خفيف** (الحالي `clearAll()`) — يفتح AlertDialog مبسّط
  - **تنظيف عميق** (الجديد) — يفتح AlertDialog محذّر:
    > "سيُمسح الكاش، Service Worker، وIndexedDB غير الحرج. جلستك محفوظة. ستُعاد تحميل الصفحة بعد ثانيتين."
- بعد التأكيد: `await runDeepClean({ queryClient })` ← `toast.success` يعرض ملخّص التقرير ← `setTimeout(() => window.location.reload(), 2500)`
- في حال خطأ: `toast.error` مع تفاصيل من `report.errors`

### 4) `src/hooks/page/admin/management/useSystemDiagnostics.ts`
- تمرير `queryClient` من `useQueryClient()` إلى المستهلك
- لا تغيير على منطق `clearAll()` الحالي

## القيود
- لا ملفات SW جديدة، لا تعديل على `firebase-messaging-sw.js`
- لا migrations، لا تغييرات DB، لا تعديل ملفات auth/RLS
- جميع النصوص عربية RTL، `hsl(var(--*))` فقط، `logger` بدل console
- حدود الحجم: Page ≤200 سطر، Hook ≤180 سطر
- اختبار وحدة قبل التسليم: `bunx vitest run deepClean`

## التحقق بعد التنفيذ
1. تشغيل `bunx vitest run` للتأكد من نجاح اختبارات `deepClean.test.ts`
2. فتح `/dashboard/diagnostics` ← تجربة "تنظيف عميق" ← التحقق من:
   - بقاء المستخدم مسجّل دخول بعد reload
   - بقاء `fiscal_year_id` في sessionStorage
   - عمل إشعارات Firebase بعد reload
