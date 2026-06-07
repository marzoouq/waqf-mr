# خطة v2 (بعد التحقق): تحسين الأداء + إشعارات بديلة + سجل backend موسَّع + زر تنظيف

تحقّقت من الكود الفعلي قبل الاعتماد. التصحيحات على الخطة السابقة:

- ✅ `Auth.tsx` **لا** يستخدم framer-motion → نشطب هذه النقطة.
- ✅ `Index.tsx` يستهلك `useLandingPage()` الذي يعيد `stats/statsLoading` → الحل الصحيح هو تأجيل تركيب البطاقات لا Suspense (لأن البيانات تأتي من hook تطبيقي وليس Suspense-source).
- ✅ `runAllDiagnostics` تكرار تسلسلي في `checks.ts` (سطر 179) → مكان مثالي لإضافة yield بين البطاقات.
- ✅ `CheckResult` نوع موجود في `types.ts` ويُصدَّر من `checks.ts` → آمن إضافة حقل `meta` اختياري.
- ✅ يوجد بالفعل `useNotifications` تحت `hooks/data/notifications/` — لن نُعدّله، فقط نقرأ منه.

---

## 1) تسريع الصفحات البطيئة (>4s)

### `/dashboard/diagnostics` — السبب الجذري

`autoRun=true` يُشغّل ~80 فحصاً في `useEffect` المباشر بعد mount. ضمنها فحوصات `appMap`/`interactions`/`conventions` تستخدم `import.meta.glob({ eager: false })` لكنها لا تزال تستورد عشرات الملفات نصياً، وفحوصات `backend` تستدعي شبكة. كلها قبل أوّل tick.

**الإجراءات:**
- (أ) في `useSystemDiagnostics.ts`: استبدال `if (autoRun) run()` المباشر بـ:
  ```ts
  const idle = (cb: () => void) =>
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback(cb, { timeout: 1500 })
      : setTimeout(cb, 300);
  ```
  ليؤجَّل أوّل تشغيل بعد التفاعل الأول (FCP لا ينتظر الفحص).
- (ب) في `runAllDiagnostics` (`checks.ts`): إضافة yield بين البطاقات داخل الـ for الخارجي:
  ```ts
  await new Promise<void>(r => setTimeout(r, 0));
  ```
  يكسر long task واحد إلى ~18 مهمة قصيرة → INP أفضل.
- (ج) لا تغيير في dynamic-import الموجود؛ فحوصات `appMap`/`interactions` تبقى كما هي لأنها تُستدعى فقط داخل `run()` المؤجَّل الآن.

### `/auth`

- (أ) إضافة `<link rel="prefetch" href="/auth">` (مُسبق التحميل البصري) في `index.html` غير ممكن لأن Vite يولّد hashes ديناميكياً، لذا الحل هو **prefetch من LandingCTA** عند hover/touch زر الدخول (`onMouseEnter={() => import('@/pages/Auth')}`).
- (ب) داخل `pages/Auth.tsx`: لا تغيير في البنية الكبير، لكن نُحوّل بطاقة Hero/branding (Logo + ornament-divider) إلى مكون `<AuthBranding>` lazy خفيف. النموذج (LoginForm/SignupForm) يَبقى في الـ critical path فيظهر فوراً.
- (ج) إزالة فحص `import.meta.glob` غير الضروري إن وُجد في `useAuthPage` (سنتحقق أثناء التنفيذ).

### `/` (Landing)

- (أ) في `useLandingPage` (لن نُعدّل المنطق، فقط الـ default state)، التأكد أن `stats` يبدأ بـ `null` و`statsLoading=true` بدون انتظار شبكة لأول render.
- (ب) في `LandingHero`: تحويل بطاقات الإحصائيات إلى placeholders Skeleton عندما `statsLoading=true` بدلاً من حجب الـ Hero.
- (ج) فحص `useLandingPage` للتأكد من أن أي استدعاء Edge Function (`dashboard-summary`) يستخدم `enabled: !isRedirecting` لتجنّب nested awaits.

**النتيجة المتوقعة (Lighthouse Mobile):**

| الصفحة | قبل | بعد |
| --- | --- | --- |
| /diagnostics FCP | ~4.0s | ~0.8s (الفحص يبدأ بعد idle) |
| /auth FCP | ~4.0s | ~1.5s |
| / FCP | ~4.0s | ~1.2s |

---

## 2) إشعارات بديلة (Polling Fallback)

ملف جديد: `src/lib/notifications/fallbackPolling.ts`

API:
```ts
export function getNotificationFallbackState(): {
  permission: 'granted' | 'denied' | 'default' | 'unsupported';
  pollingActive: boolean;
  lastPollAt: Date | null;
  pollIntervalSec: number;
};
export function tickPoll(): void; // يحدّث lastPollAt في memory
export function resetFallbackBanner(): void; // يمسح علامة dismiss في localStorage
```

- لا queue للإرسال (push يحتاج SW وهو خارج النطاق).
- يعتمد على `useNotifications` الموجود (لا تعديل عليه).

مكوّن جديد: `src/components/diagnostics/NotificationFallbackCard.tsx` يُعرض داخل تبويب «نظرة عامة»:
- حالة الإذن (granted/denied/default/unsupported) + شارة لونية
- وضع polling (نشط/غير مفعّل)
- زر «طلب الإذن مجدداً» يستدعي `Notification.requestPermission()`
- آخر نَبضة polling (نسبية: «منذ 24 ثانية»)

---

## 3) سجل backend موسَّع مع فلتر

### بنية البيانات

توسيع `CheckResult` في `types.ts` بحقل اختياري:
```ts
meta?: {
  fnName?: string;
  httpStatus?: number;
  ms?: number;
  env?: 'dev' | 'preview' | 'prod';
};
```

تحديد البيئة عبر `window.location.hostname`:
- يحتوي `id-preview--` أو `preview--` → `preview`
- ينتهي بـ `.lovableproject.com` أو localhost → `dev`
- خلاف ذلك → `prod`

### تعبئة `meta`

في `backend.ts`، كل فحص يضيف `meta` المناسب. `health-check` يحتوي fnName+httpStatus+ms+env؛ البقية ms+env.

### الواجهة

ملف جديد: `src/components/diagnostics/BackendLogTable.tsx` — تبويب جديد «سجل Backend» يعرض جدول:

| الدالة | البيئة | HTTP | الزمن (ms) | الحالة | التفاصيل |

- شارات فلتر فوق الجدول (chips Toggle): `الكل · ناجح · تحذير · فشل · معلومة`
- ترتيب تنازلي افتراضي حسب `ms`
- زر «نسخ JSON» للسطر يستخدم `navigator.clipboard.writeText`

### فلتر عام في تبويب «الفحوصات»

ملف جديد: `src/components/diagnostics/StatusFilterChips.tsx` يعرض شارات فلترة فوق grid البطاقات. state محلي في `SystemDiagnosticsPage` (`useState<CheckStatus | 'all'>('all')`).

---

## 4) زر «🧹 تنظيف وإعادة الضبط»

في شريط أدوات صفحة التشخيص، بجانب «تشغيل الكل». ينفّذ ضمن `AlertDialog` تأكيد:

1. مسح state الـ hook: `setResults([])` + `setLastRun(null)` + `setProgress(null)`
2. `clearHistory()` من `@/lib/diagnostics/history`
3. مسح `dismissed_warnings_v1` من localStorage (إن وُجد — حالياً لا يوجد، لكن نضع المفتاح للمستقبل)
4. إطلاق `window.dispatchEvent(new CustomEvent('lovable:clear-runtime-errors'))` — إن كان overlay يستمع، يمسح وإلا no-op آمن
5. `resetFallbackBanner()` لإعادة عرض بانر الإشعارات إن كان مرفوضاً مسبقاً
6. toast نجاح عبر sonner: «تم تنظيف نتائج التشخيص وإعادة ضبط الواجهات»

سيُضاف `clearAll()` في `useSystemDiagnostics` بحدود ≤180 سطر (الهوك حالياً 114 سطر، هامش كافٍ).

---

## الملفات

**جديدة:**
- `src/lib/notifications/fallbackPolling.ts` (~60 سطر)
- `src/lib/notifications/fallbackPolling.test.ts`
- `src/components/diagnostics/NotificationFallbackCard.tsx` (~90 سطر)
- `src/components/diagnostics/BackendLogTable.tsx` (~120 سطر)
- `src/components/diagnostics/StatusFilterChips.tsx` (~40 سطر)
- `src/components/auth/AuthBranding.tsx` (~50 سطر) — استخراج Hero

**معدَّلة:**
- `src/pages/dashboard/SystemDiagnosticsPage.tsx` — زر تنظيف، فلتر، تبويب «سجل Backend»، بطاقة fallback (≤200)
- `src/hooks/page/admin/management/useSystemDiagnostics.ts` — `clearAll()` + idle autoRun (≤180)
- `src/lib/diagnostics/checks.ts` — yield بين البطاقات
- `src/lib/diagnostics/types.ts` — حقل `meta` اختياري
- `src/lib/diagnostics/checks/backend.ts` — تعبئة `meta`
- `src/pages/Auth.tsx` — استبدال Hero block بـ `<AuthBranding>` lazy
- `src/components/landing/LandingHero.tsx` — Skeleton للإحصائيات عند `statsLoading`
- `src/components/landing/LandingCTA.tsx` — prefetch `/auth` عند hover

**لن نُغيّر:**
- `useAuthPage`, `useLandingPage`, `useNotifications`, `useLandingPage` Edge Functions
- `health-check` Edge Function
- أي migrations أو RLS

كل التغييرات: RTL عربية، `hsl(var(--*))` فقط، `logger` بدل console، Page ≤200 سطر، Hook ≤180 سطر.
