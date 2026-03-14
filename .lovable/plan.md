

# إصلاح المشاكل الخمس المتبقية من التقرير الجنائي

## 1. BUG-05 — `window.location.assign` في `useRealtimeAlerts.ts`

**الحالة الحالية:** السطران 45 و81 يستخدمان `window.location.assign` مما يُعيد تحميل الصفحة بالكامل ويفقد React Query cache.

**الإصلاح:** بما أن الـ hook ليس داخل Router context (لا يمكن استخدام `useNavigate` في callback)، الحل المتوافق مع القرار المعماري الموثق (استبدال reload بـ invalidateQueries) هو تمرير `navigate` function كمعامل للـ hook، ثم استخدامها في callbacks الـ toast.

**التغيير:**
- تعديل signature الـ hook لقبول `navigate` كمعامل اختياري
- استبدال `window.location.assign(path)` بـ `navigate(path)` عند توفره
- تحديث الاستدعاء في `DashboardLayout.tsx` لتمرير `useNavigate()`

## 2. BUG-08 — Race condition في `logger.ts`

**الحالة الحالية:** إذا استُدعيت `logger.error` مرتين بالتوازي، `getLogAccess` يُنفذ dynamic import مرتين.

**الإصلاح:** استخدام Promise caching بدل null check — تخزين الـ Promise نفسه وليس النتيجة:

```typescript
let _logAccessPromise: Promise<typeof logAccessEvent> | null = null;
const getLogAccess = () => {
  if (!_logAccessPromise) {
    _logAccessPromise = import('@/hooks/useAccessLog').then(m => m.logAccessEvent);
  }
  return _logAccessPromise;
};
```

## 3. BUG-09 — نوع `AuthError` في `AuthContext.tsx`

**الحالة الحالية:** `signIn` يُعلن عن إرجاع `Promise<{ error: Error | null }>` لكن Supabase يُرجع `AuthError`.

**الإصلاح:** تغيير النوع في الـ interface إلى `AuthError | Error | null` باستيراد `AuthError` من `@supabase/supabase-js`.

## 4. BUG-10 — CSP `unsafe-inline` في `index.html`

**الحالة الحالية:** `script-src 'self' 'unsafe-inline'` يُلغي حماية XSS.

**الواقع:** Vite يحقن inline scripts (مثل PWA register script-defer). بدون `unsafe-inline` سيفشل التطبيق. الحل الأنظف هو إزالة `unsafe-inline` من `script-src` فقط وإضافة `'wasm-unsafe-eval'` إذا لزم، مع الاحتفاظ بـ `'unsafe-inline'` في `style-src` (مطلوب لـ Tailwind).

**لكن** بما أن Vite PWA plugin يحقن `<script>` مباشرة بـ `injectRegister: 'script-defer'`، فإن إزالة `unsafe-inline` ستكسر تسجيل الـ SW. الحل: تغيير `injectRegister` إلى `'script'` مع `type: 'module'` أو ببساطة الإبقاء مع تعليق يشرح السبب. **القرار:** إزالة `unsafe-inline` من `script-src` وتغيير `injectRegister` إلى `'auto'` (يستخدم ملف JS خارجي بدل inline script).

## 5. BUG-11 — كاش البيانات المالية في PWA

**الحالة الحالية:** Supabase REST API يُخزَّن في PWA cache لمدة 5 دقائق — بيانات مالية حساسة.

**الإصلاح:** تغيير handler من `NetworkFirst` إلى `NetworkOnly` — البيانات المالية يجب أن تُجلب دائماً من الشبكة. React Query يتولى الكاش في الذاكرة.

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/hooks/useRealtimeAlerts.ts` | قبول `navigate` + استبدال `window.location.assign` |
| `src/components/DashboardLayout.tsx` | تمرير `useNavigate()` للـ hook |
| `src/lib/logger.ts` | Promise caching لمنع race condition |
| `src/contexts/AuthContext.tsx` | تصحيح نوع `AuthError` |
| `index.html` | إزالة `unsafe-inline` من `script-src` |
| `vite.config.ts` | تغيير `injectRegister` + Supabase API إلى `NetworkOnly` |

