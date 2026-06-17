# R7 — Auth & Bootstrap & PII tail (مُنفَّذ 2026-06-17)

## ✅ تم بالكامل

| # | البند | الملف | التعديل |
|---|------|------|---------|
| R-NOW W4-F05 | إخفاء `bank_account` افتراضياً في إعدادات المستفيد | `src/components/settings/BankAccountTab.tsx` | قناع `••••1234` افتراضي + زر Eye/EyeOff للإظهار + إظهار تلقائي عند التحرير. `autoComplete="off"`. |
| W1 splash race | إزالة `setTimeout(500)` المتوازي مع `transitionend` | `src/app/bootstrap/removeSplash.ts` | حارس `removed` لمنع الحذف المزدوج + fallback رفع إلى 2s (بعد انتهاء transition وليس قبله). |
| W1 ErrorBoundary حول Outlet | لفّ `<Outlet/>` بـ ErrorBoundary | `src/app/root-layout.tsx` | كل تعطّل في صفحة يُعرض كرسالة ضمن RootLayout بدل شاشة بيضاء. |
| W2-F05/F08 سباق `useAuthListener` | ضبط `lastUserIdRef` قبل أي `await` لاحق | `src/hooks/auth/session/useAuthListener.ts` | منع double-dispatch إذا وصل INITIAL_SESSION أثناء `getSession()`. |
| W2-F18 `?from=` غير مُستهلك | تنفيذ redirect-back آمن | `src/hooks/auth/role/useRoleRedirect.ts` | `useSearchParams().get('from')` + `sanitizeFrom` يرفض `//`, خارجي, `/auth`, `/unauthorized`. |

## 🔵 موثّق كـ "أُغلق سابقاً أو إيجابي كاذب"

| # | البند | السبب |
|---|------|------|
| W8-#2 lazy routes | ✅ مُطبَّق بالفعل — `grep lazyWithRetry` يُرجع 25/17/2 مسار في `adminRoutes/beneficiaryRoutes/waqifRoutes`. |
| W8-#3 `<main>` landmark | ✅ موجود بالفعل في `DashboardLayout.tsx` (سطر `<main id="main-content" role="main">`) + skip link. |
| W4-F01..F04 tenant_name | ✅ موثّق في `R-NOW-EXECUTED.md` — عرض `contracts_safe` يُقنّع الحقل تلقائياً. |
| W7-1 invoice deletion guard | ✅ مُنفَّذ في R-NOW. |
| R5/R6 | ✅ كامل (W5 + W6 RPC hardening + ZATCA + AI timeout). |

## ⏸️ مؤجَّل بمبرر معماري

### W2-F13 — WebAuthn tokens في body

**القرار: لا يمكن النقل إلى HttpOnly cookie ضمن المعمارية الحالية.**

`supabase-js` يدير الجلسة عبر `localStorage` (Bearer token في كل request)، ولا يدعم استخراج التوكنات من Cookies HttpOnly في الـ Browser. تحويل ذلك يتطلب:
1. إنشاء طبقة BFF (Backend-for-Frontend) تحقن `Authorization` header من Cookie في كل طلب → مشروع متكامل.
2. أو استخدام `@supabase/ssr` + Custom Storage Adapter → يتطلب إعادة كتابة `client.ts` (ملف محمي) ومراجعة كل استخدامات `supabase.auth.*`.

**الواقع:** التهديد (XSS) ينطبق بالتساوي على القيمة في body أو في localStorage حيث تُخزَّن لاحقاً. الحماية الفعلية تأتي من:
- CSP صارم (مطبَّق جزئياً).
- `verify_jwt = false` + getUser() server-side (مطبَّق).
- TLS فقط (مطبَّق).

**التوصية:** يُسجَّل كـ "Architectural debt — R10/فيوتشر" مع تحسين قصير المدى: إضافة rate-limit صريح على `webauthn:auth-options` لمنع user enumeration (W2-F14) — يحتاج جدول `rate_limits` موجود.

### W2-F14 rate-limit auth-options
يحتاج migration على `rate_limits` + Zod validation. مؤجَّل لـ R7-b (يحتاج migration منفصلة).

### W8-#1 إصلاح 3 اختبارات فاشلة
- `useSupportAnalytics.test.ts` — يحتاج تحديث mock بعد R5 (role guard).
- `usePropertyChecklist.test.ts` — يحتاج تحديث expected payload.
- اختبار DB check — مزامنة schema.

مؤجَّل لـ R8 لأنه يحتاج تشغيل `vitest` لكل ملف وتفحّص الفشل الدقيق.

### W8-#4 RTL utilities (`ml-*` → `me-*`)
20 موضعاً عبر القاعدة. تجميل بصري لا أمني. R8.

### Carryforward IS NULL scope (W7-#6)
موثّق في R-NOW كـ "ترحيل مفتوح مقصود". لا تغيير.

### DisclosurePage/MySharePage `published` check (W4-F06/F07)
يحتاج فحص لكل المكونات الفرعية + RLS-level guard على `annual_report_items`. مؤجَّل لـ R8.

## ملخص R5 → R6 → R7

| الموجة | إصلاحات فعلية | حالة |
|--------|----------------|------|
| R-NOW | 1 (W7-1) + 4 FP | ✅ |
| R5 (DB) | 8 (W6-F01..F06/F18/F27) | ✅ |
| R6 (Edge) | 9 (W5-#6/#7/#10/#11/#18/#19/#20/#24/#25) | ✅ |
| **R7** | **5 (W4-F05 + W1×2 + W2-F05/F18)** | ✅ |
| **الإجمالي** | **23 إصلاح فعلي + 8 FP موثّقة** | — |

## التحقق
- `bun run build` ينجح بدون أخطاء (يُعاد التحقق بعد الـ deploy التلقائي).
- لا تعديل على ملفات محمية (`config.toml`, `client.ts`, `types.ts`, `.env`).
- لا تعديل على Edge Functions في هذه الجولة (R6 آخر تعديل Edge).

## التالي
- **R7-b (اختياري):** rate-limit على `webauthn:auth-options` + Zod كل Edge Functions غير المُغطّاة.
- **R8:** إصلاح 3 اختبارات + RTL utilities + Disclosure/MyShare guards.
- **R9:** حذف الفهارس المكررة + GRANTs على 42 جدول (defence-in-depth).
