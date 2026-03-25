

# خطة الإصلاحات السبعة

## 1. تنظيف `package.json`
- حذف السطر الفارغ (سطر 53)
- نقل `@types/qrcode` من `dependencies` إلى `devDependencies`
- حذف `tw-animate-css` (غير مُستخدمة — `tailwindcss-animate` هي المُفعّلة فعلياً في `tailwind.config.ts`)

## 2. إصلاح `signIn` timeout في `src/contexts/AuthContext.tsx`
- حفظ timeout ID في `useRef` على مستوى المكوّن
- `clearTimeout` عند وصول حدث `SIGNED_IN`/`INITIAL_SESSION` في `onAuthStateChange` (سطر 48)
- `clearTimeout` في `signOut` (سطر 189)
- هذا يحل مشكلتي NEW-BUG-05 و NEW-AUTH-02 معاً

## 3. إصلاح تعارض PWA في `vite.config.ts`
- تغيير `clientsClaim: true` → `clientsClaim: false` (سطر 31)
- يتوافق مع `registerType: 'prompt'` + `skipWaiting: false`

## 4. تثبيت Build ID في `vite.config.ts`
- تغيير السطر 12 من `${pkg.version}-${Date.now()}` إلى `pkg.version` فقط
- يمنع إبطال كاش PWA مع كل بناء بدون تغيير فعلي

## 5. تخفيض `chunkSizeWarningLimit` في `vite.config.ts`
- من `500` إلى `300` (سطر 141)

## 6. توثيق `VITE_APP_BUILD_ID` في `.env.example`
- إضافة سطر تعليق يوضح أنه يُولَّد تلقائياً من `vite.config.ts`

## 7. نقل `SwUpdateBanner` داخل `BrowserRouter` في `src/App.tsx`
- نقل كتلة `ErrorBoundary > Suspense > SwUpdateBanner` (أسطر 130-134) إلى داخل `BrowserRouter` بعد `PagePerformanceTracker`

---

## الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `package.json` | حذف سطر فارغ، نقل `@types/qrcode`، حذف `tw-animate-css` |
| `src/contexts/AuthContext.tsx` | إضافة `useRef` للـ timeout + `clearTimeout` |
| `vite.config.ts` | `clientsClaim: false`، Build ID ثابت، `chunkSizeWarningLimit: 300` |
| `.env.example` | إضافة `VITE_APP_BUILD_ID` |
| `src/App.tsx` | نقل `SwUpdateBanner` داخل `BrowserRouter` |

