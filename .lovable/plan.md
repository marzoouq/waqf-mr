# إكمال الخطة — إصلاح فشل build

## سبب الفشل

بعد استخراج `build/chunks.ts` و`build/pwa-runtime-caching.ts` وربطهما بـ `vite.config.ts`، فشل `vite build` أثناء تحميل ملف الإعداد:

```
vite.config.ts:9:32: ERROR: Could not resolve "./build/chunks"
vite.config.ts:10:36: ERROR: Could not resolve "./build/pwa-runtime-caching"
```

الملفات موجودة فعلاً في `build/`، لكن esbuild — الذي يستخدمه Vite لتحميل ملف الإعداد — لا يجرّب `.ts` تلقائياً عند bundling ملف config خارج مسارات `include` في `tsconfig.node.json` (الذي يشمل `vite.config.ts` فقط).

## الإصلاح (تعديل واحد + توسيع include)

### 1) `vite.config.ts`
تحديث الاستيرادات لتستخدم امتداد `.ts` صراحةً (مدعوم بـ `allowImportingTsExtensions: true` الموروث من الأساس):

```ts
import { getManualChunks } from "./build/chunks.ts";
import { PWA_RUNTIME_CACHING } from "./build/pwa-runtime-caching.ts";
```

### 2) `tsconfig.node.json`
توسيع `include` ليغطي مساعدات build حتى يفحصها `tsgo`:

```json
"include": ["vite.config.ts", "build/**/*.ts"]
```

## التحقق (بعد تطبيق الإصلاح)

1. `npx tsgo --noEmit` — يجب أن ينجح بدون أخطاء.
2. `npm run build` — لا فشل في تحميل الإعداد؛ خرج البناء طبيعي.
3. `npx vitest run src/test/build-chunks.test.ts` — snapshot يمر (لا تغيير في `build/chunks.ts` ذاته).
4. `node scripts/dependency-drift-check.mjs` — ✅ 3.0.364 = 3.0.364.
5. `node scripts/count-edge-functions.mjs --check` — ✅ 22 = 22.

## خارج نطاق هذا الإصلاح

- لا تغيير على منطق `getManualChunks` ولا `PWA_RUNTIME_CACHING`.
- لا تغيير على `tsconfig.base.json` / `tsconfig.app.json` (الفحص السابق مرّ بها).
- لا تغيير على أي ملف تطبيق (`src/**`).
