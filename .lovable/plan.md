

## الفحص الجنائي — الجولة 15 (فحص عميق مباشر من قاعدة البيانات الحية)

### نتائج التحقق المباشر بند بند

| # | البند | نتيجة الفحص الحي | إصلاح؟ |
|---|-------|-------------------|--------|
| **CRIT-A** | `close_fiscal_year` تضارب نسختين | **🟡 بالتصميم** — الإنتاج يحتوي نسخة واحدة فقط (PostgreSQL يستبدل). النسخة الحية تسمح لـ admin+accountant. هذا **تحسين مقصود** — لكن `FOR UPDATE` مفقود (انظر HIGH-2) | لا |
| **CRIT-B** | `validate_advance_request_amount` لا يحسب `advance_carryforward` | **🔴 مؤكد من الإنتاج** — الدالة الحية لا تذكر `advance_carryforward` مطلقاً. `get_max_advance_amount` يحسبها (سطر 50-55). **الفجوة حقيقية**: الـ trigger يسمح بسلفة أعلى من الحد المعروض | **نعم** |
| **CRIT-C** | `icv_seq` تبدأ من 1 رغم وجود ICVs | **🔴🔴 مؤكد من الإنتاج** — `last_value=1, is_called=false` لكن `MAX(icv)=2`. أول فاتورة قادمة ستحصل على ICV=1 → **تكرار ICV = انتهاك ZATCA** | **نعم** |
| **REGRESSION-1** | `contracts_safe` بـ `security_invoker=true` يحجب المستفيدين | **🔴🔴 مؤكد من الإنتاج** — `reloptions: security_invoker=true`. سياسة `contracts` RLS: `Authorized roles can view contracts` تسمح فقط لـ `admin+accountant`. **المستفيد والواقف يحصلان على 0 صفوف** من contracts_safe. Round 12 migration (`20260318124043`) أعاد `security_invoker=true` بـ `CREATE OR REPLACE VIEW` فوق migration `20260318102000` التي أزالته | **نعم** |
| **REGRESSION-2** | `beneficiaries_safe` — الأدمين يرى `'***'` لكل PII | **🔴 مؤكد من الإنتاج** — view definition: `'***'::text AS bank_account` لكل الأدوار بلا CASE WHEN. **لكن** `security_invoker=true` فعّال → waqif محجوب (لا سياسة SELECT على beneficiaries لـ waqif). الأدمين يستخدم `get_beneficiary_decrypted()` للـ PII → تأثير محدود. المشكلة الأكبر: **الواقف لا يرى أسماء المستفيدين** عبر هذا الـ view | **نعم** |
| **DB-CRIT-1/2** | PII functions ممنوحة لـ authenticated | **🔴 مؤكد من الإنتاج** — `decrypt_pii=true, encrypt_pii=true, get_pii_key=true`. REVOKE في Round 12 (migration `20260318124043`) **موجود** في الملف لكن **لم يأخذ مفعوله** في الإنتاج. السبب المحتمل: `REVOKE ... FROM authenticated` مع function overloading أو أن الـ migration لم تُطبَّق بالكامل | **نعم** |
| **HIGH-2** | `close_fiscal_year` بدون `FOR UPDATE` | **🔴 مؤكد من الإنتاج** — الدالة الحية: `SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id` بدون `FOR UPDATE`. النسخة القديمة (`20260301134947`) كانت تحتوي `FOR UPDATE`. Race condition ممكن عند إقفال متزامن | **نعم** |
| **HIGH-3** | `audit_log` تُخزّن tenant PII بدون تقنيع | **🟡 مقبول** — `mask_audit_fields` يقنّع `notes, description, resolution_notes, content`. حقول مثل `tenant_id_number` ليست في قائمة التقنيع لكنها مشفّرة في `contracts` (ليست نصاً عادياً). audit_log مقروء فقط للناظر | لا |
| **HIGH-4** | `beneficiaries_safe` تقنّع notes حتى للمستفيد نفسه | **✅ مؤكد** — `'***'::text AS notes` لكل الأدوار. **لكن**: المستفيد لا يحتاج notes الخاصة به في الغالب (الملاحظات يضعها الناظر). التأثير ضئيل. سيُعالج ضمن REGRESSION-2 | ضمن REGRESSION-2 |
| **MED-1** | SECURITY-KNOWLEDGE.md يختبر فقط anon | **🟡 توثيقي** — لا يؤثر على الأمان الفعلي | لا |
| **MED-2** | accounts بدون UNIQUE(fiscal_year_id) | **🟡 مقبول** — `close_fiscal_year` يتحقق بـ `SELECT id ... WHERE fiscal_year_id` ثم INSERT أو UPDATE. عملياً لا تتكرر | لا |
| **MED-3** | إشعارات عقود بدون فلترة fiscal_year | **🟡 لا يمكن التحقق** — كود Edge Function يرسل رسالة عامة للمستفيدين بدون تفاصيل حساسة | لا |
| **MED-4** | `generate_all_active_invoices` ممنوحة لـ authenticated | **🟡 مقبول** — تتحقق من الدور داخلياً قبل أي عمل | لا |

---

### الإصلاحات المطلوبة — migration واحدة بـ 5 أقسام

#### 1. إصلاح icv_seq (CRIT-C)
```sql
SELECT setval('public.icv_seq', GREATEST(
  (SELECT COALESCE(MAX(icv), 0) FROM public.invoice_chain),
  (SELECT last_value FROM public.icv_seq)
), true);
```

#### 2. إصلاح contracts_safe regression (REGRESSION-1)
إعادة إنشاء `contracts_safe` **بدون** `security_invoker` مع الاحتفاظ بتقنيع notes + WHERE clause:
```sql
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
WITH (security_barrier = true)
AS SELECT ...
  CASE WHEN admin/accountant THEN c.notes ELSE NULL END AS notes,
  ...
WHERE auth.uid() IS NOT NULL
  AND (admin OR accountant OR beneficiary OR waqif)
  AND is_fiscal_year_accessible(c.fiscal_year_id);
```

#### 3. إصلاح beneficiaries_safe (REGRESSION-2)
إعادة إنشاء مع WHERE clause + CASE WHEN للأدمين/المحاسب + المستفيد يرى بياناته:
```sql
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true)
AS SELECT
  b.id, b.name, b.share_percentage, b.user_id, b.created_at, b.updated_at,
  CASE WHEN admin/accountant THEN b.national_id
       WHEN b.user_id = auth.uid() THEN b.national_id
       ELSE '***' END AS national_id,
  -- نفس المنطق لـ bank_account, email, phone, notes
FROM beneficiaries b
WHERE auth.uid() IS NOT NULL
  AND (admin OR accountant OR waqif OR b.user_id = auth.uid());
```

#### 4. إعادة REVOKE لـ PII functions (DB-CRIT-1/2) بصيغة أقوى
```sql
REVOKE ALL ON FUNCTION public.decrypt_pii(text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.get_pii_key() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pii_key() TO service_role;
```

#### 5. إصلاح validate_advance_request_amount (CRIT-B) + إعادة FOR UPDATE (HIGH-2)

**5a. Trigger**: إضافة حساب `advance_carryforward`:
```sql
-- بعد حساب v_estimated_share:
SELECT COALESCE(SUM(amount), 0) INTO v_active_carryforward
FROM advance_carryforward
WHERE beneficiary_id = NEW.beneficiary_id AND status = 'active';
v_estimated_share := GREATEST(0, v_estimated_share - v_active_carryforward);
```

**5b. close_fiscal_year**: إعادة `FOR UPDATE`:
```sql
SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
```

---

### ملخص التأثير

- **Migration واحدة** بـ 5 إصلاحات
- لا تغييرات في كود الـ frontend
- من أصل 14 بنداً: **6 للإصلاح** (2 حرجة + 2 انحدار + 1 عالية + 1 أمنية)، **0 مؤجلة**، **8 مدحوضة/مقبولة**
- أخطر اكتشافين: **contracts_safe يُرجع 0 صفوف** للمستفيدين (انحدار Round 12)، و**icv_seq ستُكرر ICV=1** عند أول فاتورة

