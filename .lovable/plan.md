

# خطة إصلاح المشاكل الحقيقية من التقرير الجنائي

## تحليل التقرير — الحقيقي مقابل الإنذارات الكاذبة

| المشكلة | الحالة | السبب |
|---------|--------|-------|
| CRIT-AI-1 | ✅ حقيقي | `getSession()` مستخدم في AiAssistant |
| CRIT-AI-2 | ✅ حقيقي | لا cooldown على إرسال الرسائل |
| HIGH-VITE-NEW-1 | ✅ حقيقي | `/functions/v1/` غير مشمولة بـ NetworkOnly |
| HIGH-PWA-1 | ✅ حقيقي | `changelog.json` يُقرأ من كاش قديم |
| HIGH-THEME-1 | ✅ حقيقي | MutationObserver بدون disconnect |
| MED-PWA-1 | ✅ حقيقي | fetch بدون AbortController |
| CRIT-CLIENT-1 | ❌ لا يُنفَّذ | `client.ts` ملف تلقائي محظور التعديل |
| HIGH-APP-1 | ❌ إنذار كاذب | منطق `chunk_retry` صحيح — يُمسح عند نجاح التحميل ويُعالَج عند الفشل المتكرر |
| HIGH-APP-2 | ❌ إنذار كاذب | `SecurityGuard` ليس في `DeferredRender` — يُحمَّل مباشرة مع `Suspense` فقط |
| HIGH-PWA-2 | ❌ مُصلح سابقاً | `skipWaiting: false` مُطبَّق بالفعل |
| HIGH-APP-3 | ❌ إنذار كاذب | `DeferredRender` يشمل `AiAssistant` فقط — لا `SecurityGuard` |
| CRIT-MAIN-1 | ⚠️ مقبول | `reload()` يحدث بعد اكتمال جميع عمليات الكاش الـ async — وقبل render React |
| MED-AI-1 | ℹ️ تحسين مستقبلي | حفظ المحادثات في DB — ميزة وليس خلل |
| MED-LOGGER-1 | ℹ️ مقبول | `error_name` معلومة عامة لا تُشكل خطراً |

## الإصلاحات (6 تغييرات في 4 ملفات)

### 1. `src/components/AiAssistant.tsx` — 3 إصلاحات

- **استبدال `getSession()` بـ `supabase.functions.invoke`** — يُرسل JWT تلقائياً بدون الحاجة لجلب token يدوياً. لكن بما أن المساعد يستخدم SSE streaming، سنستخرج token من `getUser()` مباشرة عبر الجلسة النشطة بدلاً من `getSession()`
- **إضافة cooldown 2 ثانية** بين الرسائل لمنع استنزاف API
- **تعطيل زر الإرسال** أثناء الـ cooldown

### 2. `vite.config.ts` — إصلاح واحد

- إضافة `/functions/v1/` لـ `NetworkOnly` في runtimeCaching

### 3. `src/components/PwaUpdateNotifier.tsx` — إصلاحان

- إضافة `cache: 'no-store'` + query string لـ cache-busting عند جلب `changelog.json`
- إضافة `AbortController` مع cleanup في `useEffect`

### 4. `src/components/ThemeColorPicker.tsx` — إصلاح واحد

- إرجاع دالة cleanup من `initThemeFromStorage` لفصل `MutationObserver`
- تعديل `src/main.tsx` لا يلزم لأن `initThemeFromStorage` تُنفَّذ مرة واحدة عند بدء التطبيق — لكن يجب على الأقل حفظ reference للـ observer للتوثيق

### 5. توثيق في `docs/FINAL-AUDIT-REPORT.md`

إضافة قسم بالمشاكل المكتشفة في هذه الجلسة مع تصنيفها (مُصلحة / إنذار كاذب / مستقبلية).

## الملفات المتأثرة

```text
src/components/AiAssistant.tsx      ← حذف getSession + cooldown
vite.config.ts                      ← NetworkOnly لـ /functions/v1/
src/components/PwaUpdateNotifier.tsx ← cache-busting + AbortController
src/components/ThemeColorPicker.tsx  ← observer.disconnect
docs/FINAL-AUDIT-REPORT.md          ← توثيق
```

