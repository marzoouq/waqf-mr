# W8 — Performance, a11y, PWA, SEO, Testing, Monitoring

**Date:** 2026-06-15 · **Auditor:** AI (read-only) · **Status:** Complete

## Scope
- Bundle config, lazy loading, LCP/preload, image formats
- a11y: ARIA, h-screen vs h-dvh, alt text, icon buttons, contrast tokens
- PWA: SW registration safety, manifest, runtime caching
- SEO: head meta, JSON-LD, robots.txt, sitemap.xml, canonical
- Tests: coverage, vitest config, e2e
- Monitoring: logger, errorReporter, query monitoring, ErrorBoundary

## Findings (28 · 0 🔴 / 4 🟠 / 12 🟡 / 7 🔵 / 5 ⚪)

### Performance

- **W8-001 (🟠) `min-h-screen` على 22 موضع بدون `min-h-dvh`** — يكسر تخطيط iOS Safari عند ظهور شريط العنوان الديناميكي. ملفات حرجة: `ProtectedRoute.tsx:58,73`, `Auth.tsx:23,45`, `Index.tsx:27,34`, `NotFound.tsx:8`. **الإصلاح:** استبدال شامل `min-h-screen → min-h-dvh` في مكونات الصفحات الكاملة.
- **W8-002 (🟠) لا يوجد `<link rel="preload" as="image">` لصورة LCP** — `index.html` يُحمّل خطوط Tajawal بـ preload لكن لا توجد صورة hero محددة كمرشّح LCP. مع dashboard كصفحة بدء (`start_url: /`) قد لا يكون LCP صورة، لكن صفحة الهبوط `Index.tsx` تستفيد من preload للشعار/الـ hero.
- **W8-003 (🟡) `og-image.webp` مُستضاف خارجياً على `storage.googleapis.com`** — `index.html:24,31` يشير إلى `gpt-engineer-file-uploads` بدلاً من `/og-image.webp` المحلي. زمن DNS lookup إضافي + تبعية خارجية + كشف معرّف GPT-Engineer.
- **W8-004 (🔵) build excludes vendor-pdf/recharts/d3 من precache** — قرار صحيح (W8-strength). الحجم يُحتسب عند الطلب فقط.
- **W8-005 (🔵) lazy loading عبر `lazyWithRetry` في 9 مواضع** — التطبيق lazy على مستوى الصفحات. لا توجد إحصاء مركزي للحجم النهائي بعد bump (`audit:report` script موجود لكن لم يُفعّل في CI).
- **W8-006 (🟡) لا يوجد `vite-imagetools`** — الصور المستوردة (`src/assets/*.webp`) تُخدم بحجمها الأصلي. لا تحويل AVIF عند البناء.
- **W8-007 (🟠) dashboard-summary 2438ms** (مكرر من W7-PERF) — يربط بـ W6-009/019/020 indexes ناقصة.

### a11y

- **W8-008 (⚪) 180 موضع `aria-label`** — تغطية جيدة للأزرار/الأيقونات.
- **W8-009 (⚪) 0 مخالفات `console.*`** خارج `lib/logger` + `errorReporter` + `diagnostics/` (المسموح). الالتزام بقاعدة `Never use console.log` مثالي.
- **W8-010 (🟡) `<img alt="">` على 12 موضع بدون فحص محتوى** — كل `<img>` لديه `alt`، لكن لا توجد قاعدة eslint-plugin-jsx-a11y لمنع `alt=""` غير مبرّر.
- **W8-011 (🔵) ErrorBoundary موجود في 18 موضع** — تغطية جيدة لعزل الأعطال.
- **W8-012 (🟡) لا يوجد فحص contrast آلي** — لا lighthouse-ci ولا `@axe-core/react` في devDependencies.
- **W8-013 (🔵) قاعدة `h-dvh` غير مُعتمدة في eslint** — لا حماية ضد عودة `h-screen` في PR جديد.

### PWA

- **W8-014 (⚪) PWA setup سليم تماماً** — `injectRegister: null` + `devOptions.enabled: false` + `navigateFallback: null` + NetworkFirst للـ HTML + denylist شامل (`/~oauth`, `/api/`, `/rest/v1/`, `/auth/v1/`, `/functions/v1/`, `/storage/v1/`). يتطابق مع `skill/pwa` و `mem://`.
- **W8-015 (⚪) Workbox NetworkOnly على Supabase REST/Auth/Functions** — يمنع تخزين استجابات DB حساسة.
- **W8-016 (🔵) `prompt` registerType** — يتطلب SwUpdateBanner لتفعيل update. التحقق من وجوده ضروري في كل deploy.
- **W8-017 (🟡) لا يوجد `screenshots` في manifest** — install prompt على Android Chrome يعرض UX أقل جودة بدونها.
- **W8-018 (🟡) `display: standalone` ثابت** — `start_url: /` مع `display: standalone` يعني المستخدم المثبّت لن يرى المتصفّح أبداً (قاعدة "Installed-app caveat" في `skill/pwa`). تغيير `start_url` لاحقاً يتطلب إعادة تثبيت.

### SEO

- **W8-019 (⚪) JSON-LD Organization** + canonical ديناميكي عبر `react-helmet-async` (RouteHead) + per-route og:url — متوافق مع `head-meta`.
- **W8-020 (⚪) `robots.txt` يحجب `/dashboard/`, `/beneficiary/`, `/waqif/`, `/admin/`, `/settings/`, `/auth`** — حماية ممتازة من فهرسة المسارات الخاصة.
- **W8-021 (🟡) sitemap.xml ثابت 3 إدخالات فقط** (`/`, `/privacy`, `/terms`) — لا يوجد `scripts/generate-sitemap.ts` رغم وجود `predev/prebuild` hooks في scripts. عند إضافة مسار عام جديد، لن يُحدّث تلقائياً.
- **W8-022 (🟡) `og:image` يشير إلى `gpt-engineer-file-uploads`** (مكرر مع W8-003) — يكشف معرّف المشروع GPT-Engineer ويُكسر تشغيلياً إذا حُذف من التخزين.
- **W8-023 (🔵) `google-site-verification` ثابت في `index.html`** — لا مشكلة، لكن استخدم DNS TXT أفضل.
- **W8-024 (🔵) `llms.txt` موجود في `public/`** — توجيه لـ AI crawlers.

### Tests

- **W8-025 (⚪) 255 ملف اختبار مقابل 546 مكون tsx** — نسبة تغطية ~47% بالعدد (ليست تغطية أسطر، لكن إشارة قوية).
- **W8-026 (🟡) `audit:gate` script موجود لكن لا تأكيد بأنه CI gate** — يجب التحقق من `.github/workflows/` أن `bun run audit:gate` يحجب merge.
- **W8-027 (🟡) Edge Functions: 13/22 بدون `*_test.ts`** (مكرر من W5-035).

### Monitoring

- **W8-028 (🔵) `initQueryMonitoring` + `errorReporter` + `logger` موجود** — بنية تحتية للمراقبة جاهزة، لكن لا يوجد تكامل خارجي (Sentry/Datadog) — `mem://` يمنع إضافة secrets خارجية بدون طلب صريح.

## Strengths

- لا مخالفات `console.*` على الإطلاق خارج المسارات المسموح بها.
- PWA setup مطابق لـ `skill/pwa` بدقة (preview guards، denylist شامل، NetworkOnly على Supabase).
- `robots.txt` يحجب كل المسارات الخاصة وليس فقط `/admin/`.
- canonical/og ديناميكي per-route عبر RouteHead.
- 18 ErrorBoundary + lazyWithRetry للصفحات.
- اختبارات (255 ملف) + `audit:gate` script.

## Quick Wins (موصى بها قبل الإصلاحات الكبرى)

1. **W8-001:** بحث/استبدال `min-h-screen` → `min-h-dvh` في 22 موضع.
2. **W8-003/022:** نقل `og-image.webp` محلياً (`/og-image.webp` موجود بالفعل في `public/`!).
3. **W8-017:** إضافة `screenshots[]` للـ manifest.
4. **W8-021:** تحويل sitemap.xml إلى generator script.
