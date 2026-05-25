# الخطة النهائية المعتمدة (بعد التحقق الصارم)

اعتُمدت كل ملاحظات التقرير الخارجي بعد التحقق المباشر من DB:

- لا dependents على `contracts_safe` → `CREATE OR REPLACE` آمن، **لن يُستخدم `DROP ... CASCADE`**.
- توضيح صياغة الصلاحيات: لا تغيير لنطاق الوصول الوظيفي للأدوار، بل تصحيح أمني صرف.
- التحقق من ارتباط دوال trigger فعلياً بـ `pg_trigger` قبل أي REVOKE.

---

## المرحلة 0 — إصلاح حرج لـ `contracts_safe` (Migration #1)

```sql
BEGIN;

CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = off, security_barrier = true)
AS
SELECT
  c.id, c.property_id, c.unit_id, c.start_date, c.end_date,
  c.rent_amount, c.payment_count, c.payment_amount,
  c.fiscal_year_id, c.created_at, c.updated_at,
  c.status, c.contract_number, c.payment_type,
  CASE WHEN r.is_privileged THEN c.tenant_name        ELSE '***'  END AS tenant_name,
  CASE WHEN r.is_privileged THEN c.tenant_id_type     ELSE NULL   END AS tenant_id_type,
  CASE WHEN r.is_privileged THEN c.tenant_id_number   ELSE NULL   END AS tenant_id_number,
  CASE WHEN r.is_privileged THEN c.tenant_tax_number  ELSE NULL   END AS tenant_tax_number,
  CASE WHEN r.is_privileged THEN c.tenant_crn         ELSE NULL   END AS tenant_crn,
  CASE WHEN r.is_privileged THEN c.tenant_street      ELSE NULL   END AS tenant_street,
  CASE WHEN r.is_privileged THEN c.tenant_building    ELSE NULL   END AS tenant_building,
  CASE WHEN r.is_privileged THEN c.tenant_district    ELSE NULL   END AS tenant_district,
  CASE WHEN r.is_privileged THEN c.tenant_city        ELSE NULL   END AS tenant_city,
  CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL   END AS tenant_postal_code,
  CASE WHEN r.is_privileged THEN c.notes              ELSE NULL   END AS notes
FROM public.contracts c
CROSS JOIN LATERAL (
  SELECT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role)
  ) AS is_privileged
) r
WHERE auth.uid() IS NOT NULL
  AND (r.is_privileged OR public.is_fiscal_year_accessible(c.fiscal_year_id));

REVOKE ALL ON TABLE public.contracts_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.contracts_safe FROM anon;
REVOKE ALL ON TABLE public.contracts_safe FROM authenticated;
GRANT  SELECT ON TABLE public.contracts_safe TO authenticated;
GRANT  SELECT ON TABLE public.contracts_safe TO service_role;

COMMENT ON VIEW public.contracts_safe IS
'Intentional SECURITY DEFINER view. Enforces auth.uid(), role checks, fiscal-year filtering, PII masking, and SELECT-only grants. See docs/security/views.md.';

COMMIT;
```

**صياغة دقيقة للأثر**: لا تغيير في نطاق الوصول الوظيفي للأدوار — المستفيد/الواقف/المحاسب/الناظر يستمرون في القراءة من العرض كما اعتادوا. التغيير الوحيد على مستوى DB هو تصحيح أمني: إزالة `anon` وإزالة صلاحيات الكتابة الخاطئة، وإبقاء `SELECT` فقط لـ `authenticated`.

تحقّق فوري بعد التطبيق:
- `reloptions` يحتوي `security_invoker=off, security_barrier=true`.
- `role_table_grants` يُظهر `SELECT` فقط لـ `authenticated` و `service_role`.
- لا dependents (أُكِّد قبل الكتابة).

## المرحلة 1 — توثيق الاستثناء (بعد نجاح المرحلة 0)

- `docs/security/views.md` يشرح: لماذا `security_invoker=off` لـ `contracts_safe` فقط، وما الضوابط داخل العرض.
- تحديث `docs/SECURITY-KNOWLEDGE.md` و `docs/security/security-definer-allowlist.md`.
- `manage_security_finding` بـ `ignore` على الـ ERROR مع شرح يربط للتوثيق — **بعد** التحقق فقط، وليس قبله.

## المرحلة 2 — شبكة تحكم الناظر للإظهار/الإخفاء (طبقة واجهة فقط)

- مفاتيح `app_settings` بنمط `feature_visibility.<scope>.<key>` (`visible|hidden`)، الافتراضي `visible`.
- `src/constants/featureVisibilityRegistry.ts` يُعرّف المفاتيح مع `lockable: boolean` لمنع إخفاء العناصر الإلزامية (مثل الإفصاح).
- `useFeatureVisibility(key)` يقرأ من نفس استعلام `app-settings-all` (لا استعلامات إضافية).
- `<FeatureGate featureKey="…">` يلفّ الأقسام/الويدجتات.
- تبويب جديد في `SettingsPage` للناظر فقط: شبكة (Grid) مجمّعة بالدور والصفحة، Switches، بحث/فلترة، حفظ diff فقط.
- **PR صغير**: نبدأ بعدد محدود من widgets (لوحات المستفيد/الواقف/المحاسب الأساسية)؛ بقية التغليف لاحقاً عند الطلب.

**ضمانات أمنية**: طبقة عرض بحتة، لا تستبدل أي RLS، عناصر `lockable: false` لا يمكن إخفاؤها.

## المرحلة 3 — REVOKE صارم لدوال trigger فقط (Migration #2)

قبل كتابة Migration #2، تشغيل فحص ربط الـ triggers:

```sql
select t.tgname, c.relname as table_name, p.oid::regprocedure as function_signature
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal and n.nspname='public'
order by function_signature;
```

ولا تُسحَب EXECUTE إلا من الدوال التي:
- ظهرت مرتبطة فعلياً بـ trigger في الناتج أعلاه، **و**
- ليست مذكورة في `src/**` أو `supabase/functions/**` كـ `rpc(...)`.

التواقيع تُستخرَج عبر `p.oid::regprocedure` وتُستخدم حرفياً:
```text
REVOKE EXECUTE ON FUNCTION public.<sig> FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<sig> TO postgres, service_role;
```

استثناءات صريحة (لا تُلمس):
- `custom_access_token_hook(jsonb)`، `get_public_stats()`، `log_access_event(...)`.
- `has_role`, `is_fiscal_year_accessible`, `decrypt_pii`, `encrypt_pii`, `get_pii_key`.
- أي دالة مستدعاة في `src/**` أو Edge Functions.
- دوال `enqueue_email`/`read_email_batch`/`delete_email`/`move_to_dlq` (مرحلة لاحقة بعد تدقيق المستدعيات).
- `validate_invoice_chain_ref` (بالإضافة إلى `..._reference`) — يُفحص الاثنان في DB قبل القرار.

## المرحلة 4 — تنظيف allowlist وتحقق نهائي

- إزالة دوال trigger من `scripts/supabase-lint-check.mjs` و `docs/security/security-definer-allowlist.md`.
- اختبار `src/test/contractsSafeAccess.test.ts` (Vitest على mocks للسلوك).
- تحقق SQL مباشر (ليس عبر mocks) في pipeline أو يدوياً:
  - `pg_class.reloptions` للعرض.
  - `information_schema.role_table_grants` على `contracts_safe`.
  - `has_function_privilege('authenticated', sig, 'EXECUTE')` لكل دالة في Migration #2.
- `supabase--linter` ومقارنة العدّ قبل/بعد.

## المرحلة 5 — تحسينات لاحقة (خارج هذا التشغيل)

- `log_access_event`: rate-limit + truncation + قيود على event types للـ anon.
- دوال email queue → `service_role` فقط بعد تدقيق المستدعيات.
- مراجعة كل RPC للتأكد من تحقق الدور داخلياً.

---

## تفاصيل تقنية للمراجع

- Migration #1 و #2 ملفّان منفصلان، صغيران، قابلان للرجوع.
- لا تعديل على: `client.ts`, `types.ts`, `config.toml`, `.env`.
- شبكة الناظر تستخدم `app_settings` (RLS الحالي يسمح للناظر بالإدارة فقط).
- `service_role` يحصل على `SELECT` على `contracts_safe` كاحتياط لـ Edge Functions، مع توصية واضحة بأن تستخدم الـ Edge Functions الجدول الأصلي عند الحاجة لتجاوز masking.

## الحكم النهائي

الخطة جاهزة 100% للتنفيذ بعد:
1. استخدام `CREATE OR REPLACE` (مؤكَّد آمناً — لا dependents).
2. صياغة الأثر بدقة: تصحيح صلاحيات DB فقط، بلا تغيير وظيفي للأدوار.
3. التحقق من ارتباط trigger قبل أي REVOKE.