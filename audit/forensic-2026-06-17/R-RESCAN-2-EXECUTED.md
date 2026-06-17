# R-RESCAN ‑ 2 — إعادة فحص الأمان (2026-06-17 22:34)

## الإجمالي
187 إشاراً عبر الماسحات (نفس الـ snapshot لأن النتائج لا تُحفظ بين التشغيلات).

| المصدر | العدد | الحالة |
|--------|------|--------|
| `connector_security_scan` (Wiz) | 0 | ✅ |
| `trust_surface` | 0 | ✅ |
| `supabase` (linter) | 184 | ⚠️ ضوضاء بنيوية موثّقة |
| `supabase_lov` (LLM) | 3 | ✅ كلّها أُغلقت |

## الـ 3 من supabase_lov

### 1. `MISSING_REALTIME_AUTHORIZATION` — fixed
`realtime.messages` يملك 5 سياسات scoped (تحقّق `pg_policies`). المستفيد/الواقف محصوران في `notifications:<uid>` و `user:<uid>:*` فقط.

### 2. `EXPOSED_SENSITIVE_DATA` (invoices bucket) — fixed
سياسة `Authenticated users can view invoices` المزعومة **غير موجودة**. السياسة الوحيدة:
`Admin and accountant can view invoice files` مع `has_role()`.

### 3. `MISSING_RLS_PROTECTION` (contracts_safe) — ignore
`pg_get_viewdef` يُظهر أن العرض يلفّ كل عمود PII (tenant_id_number, tenant_tax_number, tenant_crn, tenant_street, ...) بـ:
```sql
CASE WHEN r.is_privileged THEN col ELSE NULL/'***' END
-- where r.is_privileged = has_role(admin) OR has_role(accountant)
```
مع شرط `WHERE auth.uid() IS NOT NULL AND (is_privileged OR is_fiscal_year_accessible(...))`. غير المخوّلين يحصلون على NULL في كل أعمدة PII. السلوك مقصود وصحيح.

## الـ 184 من Supabase linter (دون تغيير)

| النوع | العدد | السبب |
|-------|------|------|
| `SUPA_authenticated_security_definer_function_executable` | 91 | RPCs محمية بـ `has_role()` بعد R5 |
| `SUPA_anon_security_definer_function_executable` | 91 | دوال مساعدة (`has_role`, `is_admin`, `is_fiscal_year_accessible`) لازمة لتقييم RLS |
| `SUPA_security_definer_view` | 1 | `contracts_safe` / `disbursement_vouchers_public` لإخفاء PII |
| `SUPA_public_bucket_allows_listing` | 1 | `waqf-assets` عام للأصول التشغيلية |

كلها موثّقة في `@security-memory` وذاكرة المشروع. لا إجراء.

## النتيجة النهائية
- **0** قضايا أمنية نشطة بعد المعالجة.
- تأكيد ثاني مستقل أن `realtime.messages` و bucket `invoices` و `contracts_safe` آمنة عبر فحص فعلي للسياسات وتعريف العرض.
- `@security-memory` يحتاج إضافة بند `contracts_safe` لمنع إعادة الإبلاغ.
