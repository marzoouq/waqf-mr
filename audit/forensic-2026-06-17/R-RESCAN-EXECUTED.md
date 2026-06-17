# R-RESCAN — إعادة فحص الأمان (2026-06-17 22:19)

## الإجمالي
187 إشاراً عبر 4 ماسحات:

| الماسح | العدد | الحالة |
|--------|------|--------|
| `connector_security_scan` (Wiz) | 0 | ✅ نظيف |
| `trust_surface` | 0 | ✅ نظيف |
| `supabase` (linter) | 184 | ⚠️ ضوضاء بنيوية — موثّقة |
| `supabase_lov` (LLM) | 3 | ✅ كلّها أُغلقت |

## القضايا الـ 3 من supabase_lov

### 1. `MISSING_REALTIME_CHANNEL_AUTHORIZATION` — mark_as_fixed
**التحقق:** `pg_policies` على `realtime.messages` يُظهر 5 سياسات scoped:
- `Beneficiary and waqif scoped realtime topics`
- `Users can subscribe to own scoped topics`
- `Admin and accountant full realtime access`
- `Admins and accountants full realtime access`
- `Authenticated can write to own realtime topics`

المستفيد/الواقف مقيّدون إلى `notifications:<uid>` و `user:<uid>:*` فقط. لا تسرّب بثٍ ممكن.

### 2. `EXPOSED_SENSITIVE_DATA` (invoices bucket) — mark_as_fixed
**التحقق:** السياسة المزعومة `Authenticated users can view invoices` **غير موجودة**. الفاحص يهلوس نفس النتيجة. السياسة الوحيدة:
```
Admin and accountant can view invoice files
  → has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
```

### 3. `EXPOSED_SENSITIVE_DATA` (beneficiaries PII) — ignore
**التحقق:** فحصت 5 صفوف فعلية:
- `national_id` length=105, prefix=`ww0EBw` → PGP ciphertext base64 ✅
- `bank_account` NULL في جميع الصفوف الحالية، نفس قناة التشفير عند الكتابة.

المحاسب يرى ciphertext فقط؛ فك التشفير يحدث عبر دوال SECURITY DEFINER مُحَمَّاة بـ `has_role()`. سلوك مقصود حسب مصفوفة الأدوار.

## الـ 184 من Supabase linter

| النوع | العدد التقريبي | السبب |
|------|----------------|------|
| `SUPA_authenticated_security_definer_function_executable` | ~152 | RPCs محمية داخلياً بـ `has_role()` بعد R5 |
| `SUPA_anon_security_definer_function_executable` | ~30 | دوال مساعدة (`has_role`, `is_admin`, `is_fiscal_year_accessible`) لازمة لتقييم RLS |
| `SUPA_security_definer_view` | 1 | `contracts_safe` / `disbursement_vouchers_public` لإخفاء PII |
| `SUPA_public_bucket_allows_listing` | 1 | `waqf-assets` عام للأصول التشغيلية |

كلها موثّقة في `@security-memory` وفي ذاكرة المشروع. لا إجراء.

## النتيجة النهائية
- **0** قضايا أمنية نشطة.
- **0** نتائج Wiz / trust_surface.
- جميع الـ 187 إشاراً معلَّلة ومحسومة.
- `@security-memory` مُحدَّث لتوجيه الفحوصات القادمة وتقليل الإيجابيات الكاذبة المتكررة.

## ملاحظة
نتائج `run_security_scan` snapshot ولا تُحفظ تلقائياً، لذا إشارات linter ستظهر مجدداً عند كل تشغيل بنفس التعليل.
