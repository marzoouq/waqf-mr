# M7 — Forensic Secrets & Keys Audit
**Date:** 2026-06-22  
**Scope:** `src/`, `public/`, `supabase/`, `scripts/`, `.env`, `.github/workflows/`  
**Tools:** ripgrep, git ls-files, manual code review  
**Analyst:** Automated Forensic Scan

---

## Executive Summary

تم رصد **إشكالية حرجة واحدة** (ملف `.env` محفوظ في git)، وعدة نتائج تستحق المتابعة لكنها مشروعة أو إيجابيات كاذبة. لا يوجد أي تسريب لـ `SERVICE_ROLE_KEY` كقيمة حرفية في الكود، وجميع الدوال تقرأ الأسرار من `Deno.env.get()` وليس من نص ثابت.

---

## Findings Table

| # | Pattern | File:Line | Severity | Verdict | Recommendation |
|---|---------|-----------|----------|---------|----------------|
| 1 | `SUPABASE_PUBLISHABLE_KEY` (JWT `eyJ…`) كقيمة حرفية | `.env:1,4` | 🔴 **HIGH** | **Real Leak** — ملف `.env` متعقَّب في git (`git ls-files` يؤكد ذلك). القيمة هي anon key عامة بطبيعتها لكن الملف نفسه في git يُعرِّض أي قيمة تُضاف لاحقاً للخطر | نفِّذ `git rm --cached .env` فوراً، وتحقق من تاريخ git أنه لم يُضَف `SERVICE_ROLE_KEY` في commit سابق (`git log -p -- .env`) |
| 2 | `SUPABASE_PUBLISHABLE_KEY` في `src/integrations/supabase/client.ts` | `client.ts:5-6` | 🟢 **INFO** | **Legitimate Public Key** — الملف يقرأ من `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` (متغير Vite لا قيمة حرفية) | لا شيء مطلوب — هذا النمط الصحيح |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` — مراجع متعددة | `supabase/functions/_shared/auth.ts:11` | 🟢 **INFO** | **False Positive** — جميع المراجع هي `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` وليست قيماً حرفية | لا شيء مطلوب |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` — مراجع متعددة | `supabase/functions/_shared/zatca-shared.ts:8` | 🟢 **INFO** | **False Positive** — قراءة من `Deno.env.get()` | لا شيء مطلوب |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/webauthn/helpers.ts:5` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 6 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/guard-signup/index.ts:37` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 7 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/process-email-queue/index.ts:35` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 8 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/health-check/index.ts:26` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 9 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/check-contract-expiry/index.ts:14` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 10 | `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/auth-email-hook/index.ts:245` | 🟢 **INFO** | **False Positive** — `Deno.env.get()` | لا شيء مطلوب |
| 11 | `REAL_KEY = "real-service-role-key-12345-abcdef"` | `supabase/functions/_shared/auth.test.ts:4` | 🟡 **LOW** | **False Positive** — قيمة وهمية/mock في ملف اختبار فقط (`Deno.env.set`). ليست مفتاحاً حقيقياً | يُفضَّل تغيير الاسم إلى `MOCK_KEY` أو `FAKE_KEY` لتجنب التفسير الخاطئ |
| 12 | `password` في validation messages | `src/components/auth/SignupForm.tsx:45-46` | 🟢 **INFO** | **False Positive** — نصوص واجهة مستخدم عربية للتحقق من صحة النماذج | لا شيء مطلوب |
| 13 | `password` في validation messages | `src/hooks/auth/flows/useLoginForm.ts:62-65` | 🟢 **INFO** | **False Positive** — نفس السبب | لا شيء مطلوب |
| 14 | `SERVICE_ROLE_KEY` في script | `scripts/security-gates.mjs:50` | 🟢 **INFO** | **False Positive** — نمط regex داخل أداة أمنية تبحث عن الاستخدامات | لا شيء مطلوب |
| 15 | `eyJ` JWT — بحث شامل | جميع ملفات `.ts/.tsx/.json` | 🟢 **INFO** | **No Finding** — لم يُعثر على أي JWT خارج `.env` و`client.ts` | لا شيء مطلوب |
| 16 | `BEGIN PRIVATE KEY / BEGIN RSA / BEGIN EC` | src/, public/, supabase/, scripts/ | 🟢 **INFO** | **No Finding** — لا توجد مفاتيح خاصة في الكود | لا شيء مطلوب |
| 17 | `sk_live / sk_test` | src/, public/, supabase/, scripts/ | 🟢 **INFO** | **No Finding** — لا توجد مفاتيح Stripe أو ما شابه | لا شيء مطلوب |
| 18 | `console.log` يطبع قيمة سر | `supabase/functions/auth-email-hook/index.ts:214` | 🟢 **INFO** | **False Positive** — يطبع `{ emailType, email: maskEmail(...), run_id }` فقط. البريد مُعمَّى بـ `maskEmail()` | لا شيء مطلوب |
| 19 | `console.log` يطبع `Deno.env` | جميع دوال Edge Functions | 🟢 **INFO** | **No Finding** — لا يوجد أي `console.log` يطبع قيمة `Deno.env.get(...)` مباشرة | لا شيء مطلوب |
| 20 | `public/_headers` | `public/_headers` | 🟢 **INFO** | **Legitimate** — CSP وsecurity headers صحيحة، لا تحتوي على أسرار | لا شيء مطلوب |
| 21 | `public/manifest.json` | `public/manifest.json` | 🟢 **INFO** | **Legitimate** — بيانات PWA عامة فقط (اسم، ألوان، أيقونات) | لا شيء مطلوب |
| 22 | `.github/workflows` — أسرار | جميع workflows | 🟢 **INFO** | **Legitimate** — تستخدم `${{ secrets.GITHUB_TOKEN }}` فقط (مدار من GitHub، لا قيم حرفية). `gitleaks-action` مُفعَّل في CI | لا شيء مطلوب |
| 23 | `.env` في `.gitignore` | `.gitignore` | 🟡 **MEDIUM** | **Configuration Issue** — `.gitignore` يتضمن `.env` لكن الملف متعقَّب فعلياً (git يتجاهل `.gitignore` للملفات المتعقَّبة بالفعل) | `git rm --cached .env` ثم commit — CI workflow لديه فحص يكتشف هذا ويفشل البناء |

---

## Critical Finding Detail

### 🔴 CRIT-1: `.env` Tracked in Git

```
$ git ls-files .env
.env   ← الملف موجود في git index
```

**المحتوى الحالي لـ `.env`:**
```
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51emRlYW10dWplenJzeGJ2cGZpIiwicm9sZSI6ImFub24i..."
SUPABASE_URL="https://nuzdeamtujezrsxbvpfi.supabase.co"
VITE_SUPABASE_PROJECT_ID="nuzdeamtujezrsxbvpfi"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."  ← نفس anon key
VITE_SUPABASE_URL="https://nuzdeamtujezrsxbvpfi.supabase.co"
```

**التقييم:** القيم الحالية هي **anon key** (مفتاح عام بطبيعته، يُنشر في الواجهة الأمامية). لا يوجد `SERVICE_ROLE_KEY` أو أي سر حقيقي حالياً. لكن:
- تعقُّب `.env` في git يُبطل الحماية المستقبلية
- أي مطور يضيف `SERVICE_ROLE_KEY=...` للـ `.env` سيُسرِّبه تلقائياً
- **CI workflow** في `.github/workflows/ci.yml` يحتوي على فحص صريح يفشل البناء إذا وجد `.env` متعقَّباً — هذا يعني أن CI سيفشل حالياً!

**الإجراء الفوري:**
```bash
git rm --cached .env
git commit -m "security: untrack .env from git index"
# ثم تحقق من التاريخ:
git log --all -p -- .env | grep -i "service_role\|sk_live\|sk_test\|private"
```

---

## Summary Counts

| Severity | Count |
|----------|-------|
| 🔴 HIGH (Real Leak / Critical) | 1 |
| 🟡 MEDIUM / LOW | 2 |
| 🟢 INFO / False Positive / Legitimate | 20 |

---

## Positive Security Findings

- ✅ جميع Edge Functions تقرأ الأسرار حصراً عبر `Deno.env.get()` — لا قيم حرفية
- ✅ لا يوجد `console.log` يطبع قيمة سر
- ✅ `auth-email-hook` يستخدم `maskEmail()` لإخفاء البريد في السجلات
- ✅ `gitleaks-action` مُفعَّل في CI pipeline
- ✅ `scripts/security-gates.mjs` يراقب استخدامات `SERVICE_ROLE_KEY` مع allowlist موثَّقة
- ✅ لا توجد مفاتيح خاصة (RSA/EC/PKCS8) في أي مكان
- ✅ لا توجد مفاتيح Stripe أو بوابات دفع مسرَّبة
- ✅ `.env.example` يستخدم placeholder values فقط (`your-anon-key`, `your-project-id`)
- ✅ GitHub Workflows تستخدم `${{ secrets.* }}` فقط

