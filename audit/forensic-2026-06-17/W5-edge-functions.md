# W5 — Edge Functions & Integrations (الفحص الجنائي الثاني — 2026-06-17)

22 function · 28 findings. 3 🔴 / 9 🟠 / 11 🟡 / 5 🔵.

## ✅ PASS
- (A) لا `getSession()` في أي Edge Function — كلها تستخدم `getUser()` عبر `_shared/auth.ts`.
- (D) CORS مطبّق على كل الاستجابات بما فيها الأخطاء.
- (F) `_shared/zatca-fetch.ts` يطبّق timeout 15s + retry exponential.

## 🔴 CRITICAL
1. **#10** `ai-assistant/index.ts:126` — لا `AbortController` على fetch gateway → worker يتجمّد عند upstream hang.
2. **#24** `zatca-onboard/index.ts:79` — fallback إلى `Deno.env.get("ZATCA_OTP")` يتجاوز vault والـ single-use.
3. **#25** `zatca-renew/index.ts:43` — نفس fallback OTP.
4. **#6** `lookup-national-id/index.ts:202` — `console.error` يُسرّب الـ national_id ضمن نص خطأ DB.

## 🟠 HIGH
- #3 `check-contract-expiry` بلا Zod ولا rate limit.
- #11 `lookup-national-id` fetch auth/v1/token بلا timeout.
- #12 `process-email-queue` `sendLovableEmail` بلا timeout.
- #15 `check-contract-expiry` بلا rate limit.
- #18..#20 `zatca-onboard/renew/report` يُسرّبون `fetchErr.message` (قد يحوي URL+credentials) للعميل.
- #22 4 وظائف ناقصة من `config.toml` (beneficiary-summary, multi-year-summary, year-comparison-summary, generate-voucher-pdf).
- #7 `lookup-national-id:296` — `Auth error` يُسجّل رسالة قد تحوي email/password.

## 🟡 MEDIUM / 🔵 LOW
#1 (allowlist gate)، #4 (fiscal_year_id غير UUID)، #5 (guard-signup بلا strict)، #8/#9 logging، #16 email-admin بلا rate limit، #21 ai-assistant key message، #23 process-email-queue verify_jwt، #26 LOVABLE_API_KEY يُجلب per-request، #27 dual-role key، #28 TOCTOU في email_send_log (يحتاج UNIQUE).
