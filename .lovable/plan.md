## التحقق الإضافي — مؤكَّد

شغّلت المجموعة مرتين متتاليتين:
- **التشغيل 1**: 7 فاشل / 2118 ناجح
- **التشغيل 2**: 6 فاشل / 2119 ناجح ← تباين يثبت flakiness

ثم شغّلت الـ7 ملفات منعزلة بدون توازي → **78/78 نجحت**.

فحصت كود الاختبارات (`useSupportAnalytics.test.ts`، `pages.integration.test.ts`): البنية async سليمة (`renderHook` + `waitFor` + wrapper معيارية). **لا أخطاء منطق**.

## السبب الجذري (مؤكَّد)

| العائلة | المهلة الحالية | الزمن الفعلي منعزل | الفجوة تحت التوازي |
|---|---|---|---|
| `pages.integration > AdminDashboard` | 30s | 8.7s (أول dynamic import يحمّل شجرة providers كاملة) | يتجاوز 30s |
| `checks.test.ts` (×2) | 5s افتراضي | 2.6s | يتجاوز 5s |
| `useMessaging`, `useWaqfInfo`, `useSupportAnalytics` | 5s افتراضي + waitFor 1s | 400-1100ms | `waitFor` ينتهي قبل اكتمال TanStack Query |

## الإصلاح (3 تعديلات صغيرة على إعدادات الاختبار فقط)

### 1) `vitest.config.ts` — رفع timeouts العامة
داخل `test: {...}`:
```ts
testTimeout: 15000,
hookTimeout: 15000,
```
يحل البنود 2-6.

### 2) `src/test/pages.integration.test.ts` — رفع timeout الصفحات
السطران 64 و76: تغيير `30_000` → `60_000`. يحل البند 1.

### 3) `vitest.config.ts` — تقييد التوازي (اختياري لكن موصى به)
```ts
poolOptions: { threads: { maxThreads: 4 } },
```
يقلل التنافس على CPU.

## ضمانات

- **لا تعديل كود إنتاجي** — المنطق سليم 100%.
- بعد التطبيق سأشغّل المجموعة كاملة **مرتين متتاليتين** للتأكد من 2125/2125 ✓ ثابت.
- لن أمس أي ملف خارج `vitest.config.ts` و`pages.integration.test.ts`.

هل أنفذ هذه التعديلات الثلاثة؟
