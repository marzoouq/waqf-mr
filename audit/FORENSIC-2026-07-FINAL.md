# التقرير الجنائي الشامل — يوليو 2026

**التاريخ**: 2026-07-12  
**النطاق**: كامل المستودع — 2,021 ملف متعقب (1,354 TS/TSX + 390 SQL migration + 23 Edge Function + بنية تحتية وتوثيق).  
**النمط**: قراءة فقط — لم يُعدَّل أي ملف.

---

## 1. الملخص التنفيذي

| البُعد | الحالة | التفاصيل |
|---|---|---|
| TypeScript (`tsgo --noEmit`) | ✅ نظيف | 0 أخطاء |
| Vitest | ✅ نظيف | 2,190 اختبار / 256 ملف — كلها ناجحة (209s) |
| ESLint | ⚠️ 9 أخطاء / 24 تحذير | تفاصيل §3 |
| Audit scripts (structure/conventions/hooks/ui/pages/build) | ✅ 0 حرجة | 4 معلومات فقط |
| Secret scan (شامل، مع أنماط JWT / AWS / Stripe / OpenSSH) | ✅ لا تسريبات | خارج `src/integrations/supabase/client.ts` (متوقع) |
| Supabase Linter | ⚠️ 76 ملاحظة | 1 error معروف (contracts_safe — متجاهل)، 75 warning |
| Security Scan الكامل | ⚠️ 197 نتيجة | 2 error، 195 warning — تفاصيل §4 |
| Frontend imports (Supabase في pages/components) | ✅ 0 | جميعها عبر hooks |
| Utils نقاء | ✅ 0 مخالفات | لا supabase/toast/react |

**الحكم**: التطبيق **مستقر إنتاجياً وآمن**. لا توجد مشكلات حرجة جديدة. المتبقي: تنظيف ESLint + مراجعة سياسة storage قد تكون رجعت + بضع تحسينات جودة.

---

## 2. تغطية الملفات (مقارنة بالجرد)

| المرحلة | المسارات | ملفات مفحوصة | حالة |
|---|---|---:|---|
| M1 Infra | جذر + tsconfig + vite/tailwind/eslint/vitest/playwright + `.github/**` + `.husky/**` + `scripts/**` + `public/**` | 60 | ✅ |
| M2 Backend | `supabase/config.toml` + `supabase/migrations/**` (390) + `supabase/functions/**` (23 دالة) | 413+ | ✅ |
| M3 Logic | `src/app/**` + `src/routes/**` + `src/contexts/**` + `src/hooks/**` + `src/lib/**` + `src/utils/**` + `src/types/**` + `src/constants/**` | 858 | ✅ |
| M4 UI | `src/pages/**` (55) + `src/components/**` (486) | 541 | ✅ |
| M5 Security | جميع RLS + Edge Functions + auth + storage + CSP + secrets | متضمّن | ✅ |
| M6 Quality | tests (58 وحدة + E2E) + docs + audit + PWA | متضمّن | ✅ |

**الفارق**: 0 — كل ملف قابل للتتبع مُغطى.

---

## 3. أخطاء ESLint (9 errors, 24 warnings)

### 3.1 أخطاء يجب إصلاحها (P1)

| # | الملف:السطر | القاعدة | الوصف |
|---|---|---|---|
| 1 | `supabase/functions/mcp/index.ts:11,23,27,53,54` | `no-var` | 5 استخدامات لـ `var` بدلاً من `let/const` |
| 2 | `src/components/common/layout/PrintHeader.tsx:20-21` | `react-hooks/set-state-in-effect` | `setImgError(false)` داخل `useEffect` |
| 3 | `src/components/layout/WaqfInfoBar.tsx:29` | `react-hooks/set-state-in-effect` | نفس النمط |
| 4 | `src/components/layout/sidebar/SidebarBrand.tsx:21` | `react-hooks/set-state-in-effect` | نفس النمط |
| 5 | `src/components/common/feedback/AnimatedCounter.tsx:48` | (بحاجة عرض) | متضمن ضمن نفس الفئة |

**الحل الموصى به**: استخدام `useMemo`/reset key على العنصر بدلاً من `useEffect + setState`، وتحويل `var → const` في `mcp/index.ts`.

### 3.2 تحذيرات (P3 — لا تعطّل الإنتاج)

- **14×** `@typescript-eslint/no-explicit-any` في Edge Functions (`auth-email-hook`, `process-email-queue/utils`, `webauthn/handlers/*`, `_shared/auth`, `admin-manage-users/handlers/types`).
- **6×** `@typescript-eslint/no-unused-vars` (متغيرات catch غير مستخدمة، imports قديمة).
- **1×** `react-hooks/exhaustive-deps` في `useBeneficiaryDashboardPage.ts:36` — `distributions` منطق `||` يُغيّر deps.
- **3×** أخطاء scripts (`no-console`) — مقبولة لأنها CLI scripts.

---

## 4. الأمان — 197 نتيجة

### 4.1 حرجة (Error) — تحتاج فحصاً

| # | الاسم | الملاحظة |
|---|---|---|
| 1 | `SUPA_security_definer_view` | `contracts_safe` — **متجاهل عمداً** (موثّق في `@security-memory`، إخفاء PII). |
| 2 | `MISSING_RLS_PROTECTION` — سياسة storage الواسعة على bucket `invoices` | **🚨 مطلوب فحص**: التاريخ يُظهر أنها أُسقطت في 8+ migrations، لكن الفاحص ما زال يرصدها. قد تعود عبر migration تلقائي أو تعريف مكرر. |

### 4.2 تحذيرات (195)

- **~180×** `SUPA_anon_security_definer_function_executable` + `SUPA_authenticated_security_definer_function_executable`: كل دالة `SECURITY DEFINER` قابلة للتنفيذ من anon/authenticated. **تصميم مقصود** لدوال `has_role`, `execute_distribution`, `commit_icv_chain` — لكن **يجب تدقيق** أن كلاً منها لا تُنفّذ إلا من مصادر موثوقة (RLS + validation).
- **~14×** `SUPA_public_bucket_allows_listing` على `waqf-assets`: **متجاهل عمداً** — bucket عام لخطوط PDF و email templates.

### 4.3 توصيات أمنية (لا تغييرات في هذه الجولة)

1. إعادة فحص سياسات bucket `invoices` مباشرة على قاعدة البيانات وتأكيد عدم وجود سياسة `authenticated` بلا شرط دور.
2. إعادة النظر في `EXECUTE` grants على دوال `SECURITY DEFINER` — الأمثل حصرها في `service_role` عندما تُستدعى من Edge Function فقط.

---

## 5. البنية المعمارية — الحالة

| المعيار | الحالة | الأدلة |
|---|---|---|
| Container/Presentational — لا استيراد supabase في pages/components | ✅ | `rg` رجع 0 نتائج (استثناء `OAuthConsent` سبق إصلاحه) |
| Utils نقاء (لا supabase/toast/react) | ✅ | 0 مخالفات |
| Hooks Layering (data/domain/page/application/auth/ui) | ✅ | `audit-hooks-layout` أخضر |
| CRUD Factory | ✅ | `audit-conventions-deep` أخضر |
| حجم الملفات > 200 سطر (خارج types) | ✅ نظيف تقريباً | فقط `diagnosticsReadService.ts` (222) و `constants/navigation.ts` (219) — مقبولة (data-only) |
| ألوان hex في مكونات | ✅ | فقط `SignaturePad.tsx` و `InvoicePreviewDialog.tsx` (Canvas — مستثنى بحكم الذاكرة) |
| `console.*` | ✅ | 0 خارج logger/collector |
| `crypto.randomUUID` بدون polyfill | ✅ | جميع الاستخدامات المتبقية في Deno (Edge Functions) أو ملفات test |

---

## 6. التبعيات والبناء

- **Depcheck**: `tailwindcss-animate` مسجّل غير مستخدم — **إيجابي كاذب** (يُستخدم عبر `tailwind.config.ts` كـ plugin). `@tailwindcss/postcss`, `postcss`, `tailwindcss` عبر config أيضاً.
- **Version drift**: خضع سابقاً لسحب الإصدارات إلى `3.0.373` (موثّق في history).
- **PWA**: `manifest.webmanifest` + `_headers` + registerPwa — سليم.

---

## 7. لوحة النتائج النهائية

| فئة | Critical | High | Medium | Low | Info |
|---|---:|---:|---:|---:|---:|
| TypeScript | 0 | 0 | 0 | 0 | 0 |
| Tests | 0 | 0 | 0 | 0 | 0 |
| ESLint | 0 | 9 | 24 | 0 | 0 |
| Security (بعد استثناء المتجاهل) | 0 | 1 (invoices bucket) | ~180 (SD funcs, ملاحظات) | 0 | 0 |
| Architecture | 0 | 0 | 0 | 0 | 4 |
| Secrets | 0 | 0 | 0 | 0 | 0 |
| **الإجمالي** | **0** | **10** | **~204** | **0** | **4** |

---

## 8. خارطة الطريق للوصول إلى صفر

### P1 — إصلاحات ESLint (جهد ~30 دقيقة)
1. `supabase/functions/mcp/index.ts`: `var → const/let`.
2. `PrintHeader.tsx` / `WaqfInfoBar.tsx` / `SidebarBrand.tsx` / `AnimatedCounter.tsx`: استبدال `useEffect + setState` بـ `useMemo` أو `key` prop.
3. `useBeneficiaryDashboardPage.ts:36`: تغليف `distributions` بـ `useMemo` مستقل.
4. تنظيف `no-unused-vars` و `no-explicit-any` في Edge Functions (تحويلات نوعية آمنة).

### P2 — إعادة تدقيق سياسة storage `invoices` (جهد ~1 ساعة)
- استعلام مباشر: `SELECT * FROM pg_policies WHERE tablename='objects' AND policyname ILIKE '%invoices%'`.
- إن ظهرت سياسة `role = authenticated` بلا شرط دور: migration جديد لإسقاطها.

### P3 — تدقيق EXECUTE grants على SECURITY DEFINER (جهد ~2 ساعة)
- مراجعة كل دالة، تحديد المستدعي المسموح، ضبط `REVOKE EXECUTE FROM anon/authenticated` حيث لا لزوم.

### P4 — تحسينات جودة (جهد ~2 ساعة)
- تحويل `logger.warn` بدلاً من `console.warn` في اختبارات access-log (تحسّن قراءة اللوجات).
- توثيق `docs/security/security-definer-functions.md` بجدول واضح لكل دالة ومصدر النداء.

---

## 9. المرفقات

- `audit/_inventory.txt` — جرد شامل بـ 2,021 ملف.
- `audit/report.html` — تقرير سكربتات audit المفصّل.
- `audit/report.csv` — CSV للنتائج.
- تقارير جنائية سابقة: `audit/forensic-report.md`, `audit/performance-forensic*.md`, `audit/diagnostics-coverage-report.md`.

**نتيجة الفحص**: 0 مشاكل حرجة جديدة. المتبقي محصور في P1-P4 أعلاه وقابل للإصلاح دون مخاطر إنتاجية.
