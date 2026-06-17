## نتائج إعادة الفحص (2026-06-17 22:19)

**الإجمالي:** 187 إشاراً — `supabase` linter: 184، `supabase_lov` (LLM): 3، `connector_security_scan` (Wiz): 0، `trust_surface`: 0.

### 1) الإشارات الـ 184 من Supabase linter — ضوضاء بنيوية

| النوع | العدد | الحالة |
|------|------|--------|
| `SUPA_anon_security_definer_function_executable` | ~30 | ⚠️ مقصود — دوال `has_role`, `is_admin` ضرورية للتقييم على PostgREST |
| `SUPA_authenticated_security_definer_function_executable` | ~152 | ⚠️ مقصود — RPCs محمية داخلياً بـ `has_role()` (R5) |
| `SUPA_security_definer_view` | 1 | ⚠️ مقصود — `contracts_safe` / `disbursement_vouchers_public` لإخفاء PII (موثّق في `mem://security/views/contracts-safe-rationale`) |
| `SUPA_public_bucket_allows_listing` | 1 | ⚠️ مقصود — `waqf-assets` عام للأصول (موثّق) |

لا يمكن حلّ هذه دون كسر المنطق التشغيلي. ستُحدَّث `@security-memory` لتوجيه الفاحص.

### 2) قضايا `supabase_lov` الثلاث

#### (أ) `MISSING_REALTIME_CHANNEL_AUTHORIZATION` — 🔴 إيجابي كاذب
تحققت من `realtime.messages`:
- ✅ RLS مُفعَّل + 5 سياسات scoped:
  - `Beneficiary and waqif scoped realtime topics` → `notifications:<uid>` و `user:<uid>:*` فقط
  - `Users can subscribe to own scoped topics` → نفس النطاق
  - admin/accountant: وصول كامل
- **القرار:** mark_as_fixed مع شرح.

#### (ب) `EXPOSED_SENSITIVE_DATA` (invoices bucket) — 🔴 إيجابي كاذب متكرّر
تحققت بـ `pg_policies`: سياسة `Authenticated users can view invoices` **غير موجودة**. السياسة الوحيدة للقراءة هي `Admin and accountant can view invoice files` مع `has_role()`. الفاحص يهلوس نفس النتيجة. **القرار:** mark_as_fixed مرة أخرى مع تقوية الذاكرة.

#### (ج) `EXPOSED_SENSITIVE_DATA` (beneficiaries PII للمحاسب) — 🟡 يحتاج تحقّق
المحاسب لديه `ALL` على `beneficiaries` بدون قيود أعمدة. الذاكرة تنصّ أنّ `national_id` و `bank_account` مشفّرتان AES-256 عبر `pgcrypto`. سأتحقّق فعلياً من قيم العمودين (هل تخزّن نصاً صريحاً أم `bytea` مشفّر؟) قبل اتخاذ قرار:
- إذا مشفّرة فعلياً → mark_as_fixed (سلوك مقصود + تشفير في مكانه).
- إذا غير مشفّرة → migration: نقل `national_id`/`bank_account` إلى أعمدة `_encrypted bytea` + دوال SECURITY DEFINER للقراءة المحكومة.

## ما سأنفّذه في وضع البناء

1. `supabase--read_query` على عينة من `beneficiaries.national_id` و `bank_account` لتأكيد التشفير.
2. حسب النتيجة:
   - **إن مشفّرة:** `manage_security_finding` × 3 (fixed/ignore) + `update_memory`.
   - **إن غير مشفّرة:** migration يشفّر الأعمدة قبل إعلانها fixed.
3. إنتاج تقرير `audit/forensic-2026-06-17/R-RESCAN-EXECUTED.md` يلخّص الـ 187 إشاراً وقرار كلٍ منها.

## ملاحظة
هذا الفحص snapshot ولا يُحفظ تلقائياً، لذا الإشارات الـ 184 من linter ستعود في كل فحص قادم. الإجراءات الفعلية تنحصر في الـ 3 الأخيرة.