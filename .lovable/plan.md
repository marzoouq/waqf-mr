# الخطة النهائية — اختبارات سلوك تحديث PWA (بعد فحص التعارضات الكامل)

## نتائج فحص التعارضات

| فحص | النتيجة |
|---|---|
| الملفات الأربعة موجودة مسبقاً؟ | ❌ لا — كلها جديدة (لا تكرار) |
| `vitest.config.ts` يلتقط `src/**/*.{test,spec}.{ts,tsx}` | ✅ نعم |
| `src/test/setup.ts` متوافق (jsdom + موك `useAuth` عام + `matchMedia`) | ✅ نعم |
| موك سابق لـ `virtual:pwa-register/react` | ❌ غير موجود — نُنشئه داخل كل ملف اختبار عبر `vi.mock` |
| نقطة تركيب البانر | ⚠️ `src/app/root-layout.tsx` (وليس `App.tsx`) — تصحيح في وثيقة QA |
| `pwaBootstrap.ts` يحوي `location.reload` | ❌ لا (نظيف) — حارس الانحدار يمرّ من أول تشغيل |
| `SwUpdateBanner.tsx` يحوي `location.reload` مباشر | ❌ لا — يستخدم `updateServiceWorker(true)` من workbox فقط |
| `isPreviewHost`/`isInIframe` ثوابت module-level | ⚠️ تتطلب `vi.resetModules()` + `vi.stubGlobal` + `await import()` ديناميكي |
| Coverage thresholds (60%) | ✅ آمن — الاختبارات تزيد التغطية ولا تنقصها |
| ESLint `no-console` / `eqeqeq` | ✅ سيُلتزم بها في الاختبارات الجديدة |

## الأهداف المُتحقَّق منها
1. شريط التحديث يظهر **مرة واحدة فقط** عند نشر جديد فعلي.
2. لا يظهر عند فتح/إغلاق التطبيق دون نشر.
3. لا `location.reload()` قسري — التحديث يدوي بموافقة المستخدم.
4. لا يتكرر عند التنقل بين تبويبات لوحات الناظر/المستفيدين.

## الملفات (3 اختبارات + وثيقة)

### 1) `src/components/pwa/SwUpdateBanner.test.tsx` — Vitest + RTL
موك على مستوى الملف:
```ts
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(),
}));
```
ثم في كل سيناريو نتحكم بقيمة `useRegisterSW` عبر `mockReturnValue`.

**6 سيناريوهات**:
1. `needRefresh=false` → لا بانر يُرسم.
2. `needRefresh=true` → البانر يظهر بنص "يوجد تحديث جديد للتطبيق".
3. ضغط "تحديث الآن" → `updateServiceWorker(true)` يُستدعى **مرة واحدة فقط** + `pwa_just_updated` يُكتب في `localStorage`. لا استدعاء يدوي لـ `location.reload`.
4. ضغط X → البانر يختفي + `pwa_snoozed_version` = `{sw: fingerprint, ts}`.
5. remount بنفس fingerprint داخل 24س → `setNeedRefresh(false)` يُستدعى تلقائياً → لا بانر.
6. remount بـ fingerprint مختلف → البانر يظهر (نشر جديد فعلي).

`beforeEach`: `localStorage.clear()` + `vi.clearAllMocks()`.

### 2) `src/lib/pwaBootstrap.test.ts`
- `beforeEach`: `vi.resetModules()` + `vi.stubGlobal('caches', mockCaches)` + موك `navigator.serviceWorker.getRegistrations`.
- **Test A** (إنتاج): `vi.stubGlobal('location', { hostname: 'waqf-wise.net' })` + `window.top === window.self` → `await import(...)` → `runPwaCacheGuard()` → التأكد أن `caches.delete` **لم** يُستدعَ ولا `location.reload`.
- **Test B** (preview): hostname `id-preview--xxx.lovable.app` → SW unregister يُستدعى + caches تُمسح، **لا** reload.

### 3) `src/components/pwa/__tests__/no-forced-reload.test.tsx` — حارس انحدار
- يقرأ كل `src/**/*.{ts,tsx}` (يستثني `*.test.*` و `*.spec.*`).
- يطابق `/\blocation\.reload\s*\(/` بـ regex.
- Allowlist فارغ حالياً (لأن `pwaBootstrap.ts` و `SwUpdateBanner.tsx` نظيفان من `location.reload` المباشر).
- يفشل عند ظهور أي استدعاء جديد.
- ملاحظة: `main.tsx` يحوي `onclick="location.reload()"` داخل **سلسلة HTML** للـ fallback — سنستثنيها بقاعدة "خارج السلاسل" أو نُضيف `main.tsx` للـ allowlist مع تعليق توضيحي.

### 4) `docs/pwa-update-qa.md` — قائمة فحص يدوية بالعربية
جدول لـ Android Chrome / iOS Safari / Desktop Chrome مع 5 سيناريوهات:
- فتح/إغلاق 3 مرات بدون نشر → 0 بانر.
- نشر JS فعلي → بانر مرة واحدة خلال ≤30ث (بارد) أو ≤5دق (مفتوح).
- ضغط "تحديث الآن" → reload واحد + toast سجل تغييرات → إعادة فتح → لا بانر.
- ضغط X → لا بانر لنفس النسخة خلال 24س.
- التنقل بين `/dashboard`, `/dashboard/reports`, `/contracts`, `/distributions`, `/beneficiary/*` → البانر لا يتكرر (مُركَّب مرة واحدة في `src/app/root-layout.tsx` خارج `<Outlet/>`).

## المخاطر بعد التنفيذ وتخفيفها

| مخاطرة | التخفيف |
|---|---|
| موك `virtual:pwa-register/react` لا يُحلّ في jsdom | `vi.mock` على مستوى الملف قبل أي `import` للمكوّن |
| تسريب state بين سيناريوهات `SwUpdateBanner` | `beforeEach`: `localStorage.clear()` + `vi.clearAllMocks()` |
| `pwaBootstrap` يستخدم ثوابت module-level | `vi.resetModules()` + dynamic `await import()` بعد stub |
| حارس `no-forced-reload` يلتقط `main.tsx` HTML string | استثناء `main.tsx` بـ allowlist مع تعليق، أو regex يستبعد ما داخل علامات الاقتباس |
| كسر coverage thresholds | الاختبارات تزيد التغطية → لا خطر |

## ما **لن** يُعدّل
- `SwUpdateBanner.tsx`, `pwaBootstrap.ts`, `vite.config.ts`, `root-layout.tsx`, `main.tsx`.
- أي ملف خارج اختبارات PWA + الوثيقة.

## ما **لن** يُنفَّذ
- **Playwright** فعلي: غير مثبّت؛ يحتاج deps + CI + بيئة نشر. مهمة منفصلة عند الطلب.

## التحقق الكامل بعد التنفيذ (إلزامي قبل الإنهاء)
1. `bunx vitest run src/components/pwa src/lib/pwaBootstrap.test.ts` → الاختبارات الجديدة كلها تمر.
2. **`bunx vitest run` (كامل السويت)** → الـ 1888 الحالية + الجديدة كلها خضراء، صفر انحدار.
3. تقرير نهائي بعدد الاختبارات الإجمالي + أي إصلاحات مطلوبة قبل التسليم.
