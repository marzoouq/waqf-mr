# خطة إكمال الموجات التصحيحية المتبقية

بعد فحص التقارير، الحالة الفعلية:

| الموجة | الحالة |
|--------|--------|
| R-NOW | ✅ 1 إصلاح (W7-1) + 4 false-positives موثّقة. **متبقٍ:** W4 F-05 فقط (bank_account نصاً صريحاً) |
| R5 (DB) | ✅ مُنفَّذة بالكامل — W6 F01..F06/F18/F27 |
| R6 (Edge) | ✅ مُنفَّذة بالكامل — 9 إصلاحات ZATCA/AI/lookup |
| **R7 (Auth+WebAuthn+W1)** | ⏸️ **هذه الموجة** |
| **R8 (Perf+A11y+Tests)** | ⏸️ **هذه الموجة** |

التقرير الذي استشهد به المستخدم (16 🔴) يعكس حالة قبل R5/R6 — كثير منه أُغلق فعلاً. هذه الخطة تنفّذ كل ما تبقى حقيقةً.

---

## R-NOW-tail — بند واحد متبقٍ

### W4-F05 — `bank_account` نصاً صريحاً في `BeneficiarySettingsPage`
- إخفاء قيمة الحقل افتراضياً (mask `••• 1234`) مع زر "إظهار" يستدعي RPC `decrypt_bank_account_for_owner` (موجود) عند الحاجة فقط.
- منع تمرير القيمة الخام كـ defaultValue لـ Input.

---

## R7 — Auth & WebAuthn & W1 (5 🔴 + 2 🟠)

### 1) `useAuthListener` — إزالة السباقات (W2-F05/F08/F23, W1)
- **F-05/F-08:** ضبط `lastUserIdRef.current` **قبل** استدعاء `getSession()` في كتلة fallback لمنع double-dispatch.
- **F-23:** إزالة `getSession()` الزائد بعد `getUser()` — الاعتماد على `currentSession` من المستمع فقط (إذا لم يصدر INITIAL_SESSION خلال 200ms نستخدم `getUser` ثم `getSession` مرة واحدة).
- **W1 double role:** dedup بـ `(userId, role)` بدل `userId` فقط لمنع overwrite دور JWT بدور DB متأخّر.

### 2) WebAuthn — إخراج التوكنات من body (W2-F13)
- تعديل `supabase/functions/webauthn/handlers/auth-verify.ts`:
  - بدل إرجاع `{ access_token, refresh_token }` في body → إرجاع `Set-Cookie: sb-access-token=...; HttpOnly; Secure; SameSite=Strict; Path=/` و `sb-refresh-token` مماثل.
  - body يصبح `{ ok: true, user_id }` فقط.
- تعديل `src/hooks/auth/biometric/useWebAuthnAuth.ts`:
  - حذف `supabase.auth.setSession({ access_token, refresh_token })` المباشر.
  - بعد نجاح verify → `supabase.auth.refreshSession()` يلتقط الكوكي تلقائياً.

### 3) WebAuthn — حماية auth-options من user enumeration (W2-F14)
- إضافة rate-limit (5/دقيقة لكل IP) في `auth-options.ts` + إرجاع استجابة موحّدة (لا تكشف وجود/عدم وجود credential).

### 4) `?from=` consume بعد login (W2-F18)
- في `useRoleRedirect.ts`: قراءة `searchParams.get('from')`، التحقق أنه مسار داخلي آمن (`startsWith('/')` ولا يحتوي `//`)، ثم `navigate(from)` بدل default route.

### 5) Bootstrap (W1)
- **splash race:** إزالة `setTimeout(500)` المتوازي مع `transitionend` — الاعتماد على `transitionend` فقط مع fallback `2s` (وليس `0.5s` يسبق الـ transition).
- **`<Outlet/>` بلا ErrorBoundary:** لفّ `<Outlet/>` في `root-layout.tsx` بـ `ErrorBoundary`.
- **ProtectedRoute spinner بلا timeout (F-06):** إضافة `useEffect` يحوّل إلى `<Unauthorized/>` بعد 8s إذا بقي `loading=true` بسبب فشل جلب الدور.

---

## R8 — Perf & A11y & Tests (3 🔴 + 5 🟠)

### 1) إصلاح الاختبارات الفاشلة الثلاثة (W8-#1)
- `useSupportAnalytics.test.ts` — إصلاح mock للـ RPC الجديد بعد R5 (يتطلب role).
- `usePropertyChecklist.test.ts` — تحديث expected payload.
- اختبار DB check — مزامنة مع schema الحالي.

### 2) Lazy routes (W8-#2)
- تحويل كل صفحات `adminRoutes`/`beneficiaryRoutes`/`waqifRoutes` إلى `lazyWithRetry` (موجود).
- التحقق من split: `bun run build` ثم مراجعة `dist/assets/*.js` للتأكد من chunking لكل route.

### 3) `<main>` landmark + skip-to-content (W8-#3)
- تعديل `DashboardLayout`: لفّ المحتوى بـ `<main id="main-content" tabIndex={-1}>`.
- إضافة skip link مرئي عند focus في `RootLayout`.

### 4) RTL utilities (W8-#4)
- استبدال 20 موضع `ml-*/mr-*/pl-*/pr-*` بـ `ms-*/me-*/ps-*/pe-*` (script grep+sed يدوي).

### 5) DisclosurePage/MySharePage published check
- إضافة guard على `annual_report_status.status === 'published'` قبل عرض الأرقام؛ غير ذلك → "التقرير قيد المراجعة".

### 6) Carryforward IS NULL scope
- في `useActiveCarryforwards`: تقييد `to_fiscal_year_id IS NULL` بأن السنة `fy` هي الأقدم بعد `from_fiscal_year_id` (window function أو filter في الكلاينت).

---

## ما لن يُنفَّذ في هذه الخطة (مؤجَّل)

| الموجة | البنود | السبب |
|--------|--------|------|
| R9 | حذف 10 فهارس مكررة + GRANTs على 42 جدول | تنظيف أداء، يحتاج migration كبيرة مستقلة |
| R10 | 77 🟡 LOW (sitemap, og:url, manifest screenshots, console leaks, إلخ) | تجميل |
| W5 المؤجَّل | Zod على check-contract-expiry, sendLovableEmail timeout, dual-role key | حُدِّد في R6 لـ R7-tail (نُنجزه لاحقاً) |

---

## ترتيب التنفيذ بعد الموافقة

1. R-NOW-tail (W4-F05) — 1 ملف.
2. R7 — 6 ملفات (`useAuthListener.ts`, `auth-verify.ts`, `auth-options.ts`, `useWebAuthnAuth.ts`, `useRoleRedirect.ts`, `root-layout.tsx`, `removeSplash.ts`, `ProtectedRoute.tsx`).
3. R8 — تحديث 3 ملفات تست + تحويل 3 ملفات routes إلى lazy + تعديل `DashboardLayout.tsx` + sed RTL utilities + guards على Disclosure/MyShare + filter carryforward.
4. تقرير `audit/forensic-2026-06-17/R7-R8-EXECUTED.md` يلخّص ما تم.
5. تشغيل `bunx vitest run` للتحقق من المرور.

**زمن متوقع:** R-NOW-tail + R7 ≈ جلسة واحدة. R8 جلسة ثانية بسبب الـ build verification.

هل أبدأ التنفيذ الآن، أم تريد تقسيمه (R7 الآن، R8 لاحقاً)؟
