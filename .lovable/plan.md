

# خطة إصلاح المشاكل المتبقية فعلياً

## الحالة الحقيقية — ما تم إصلاحه بالفعل

التقرير يُدرج 46 مشكلة مفتوحة، لكن المراجعة الجنائية للكود الحالي تُظهر أن **معظمها مُصلح**:

| المشكلة | الحالة الفعلية | الدليل |
|---------|---------------|--------|
| C-1: lookup_by_national_id | ✅ مُصلح | migration `20260314040815` — فحص `service_role` |
| C-2: get_next_icv race condition | ✅ مُصلح | migration `20260314040815` — `pg_advisory_xact_lock` |
| C-3: Storage accountant | ✅ مُصلح | migration `20260314040135` — 3 policies |
| C-4: ترتيب الحذف | ✅ مُصلح | `useInvoices.ts:148-160` — DB أولاً |
| C-5: getSession → getUser | ✅ مُصلح | `useInvoices.ts:231` — `getUser()` أولاً |
| C-6: ALTER FUNCTION trigger | ✅ مُصلح | migration `20260314040815:68` |
| H-1: WITH CHECK | ✅ مُصلح | migration `20260314040815:160-164` |
| H-2: replies status check | ✅ مُصلح | migration `20260314040815:169-181` |
| H-3: accountant ZATCA access | ✅ مُصلح | migration `20260314040815:74-82` |
| H-4: dedup fix | ✅ مُصلح | migration `20260314040815:112-132` |
| H-5: magic bytes | ✅ مُصلح | `useInvoices.ts:82-99` |
| H-6: createSignedUrl | ✅ مُصلح | `useInvoices.ts:206-219` |
| H-7: centralized constants | ✅ مُصلح | `InvoicesPage.tsx:11` imports from useInvoices |
| H-8: audit triggers | ✅ مُصلح | migration `20260314040815:204-210` |
| H-9: advance_max_percentage | ✅ مُصلح | migration `20260314023052:45-47` — reads from `app_settings` |
| M-1: UNIQUE invoice_number | ✅ مُصلح | migration `20260314040135:75-77` |
| M-3: storage try/catch | ✅ مُصلح | `InvoicesPage.tsx:139-141` |
| M-4: sanitizeDescription | ✅ مُصلح | `InvoicesPage.tsx:34-37` |
| M-5: VAT validation | ✅ مُصلح | migration `20260314040135:31-70` — triggers |
| M-7: user_id IS NOT NULL | ✅ مُصلح | migration `20260314040815:131` |

**النتيجة: من 46 مشكلة مفتوحة في التقرير، 20+ مُصلحة بالفعل.**

---

## المشاكل المتبقية فعلياً (تحتاج عمل)

### Migration 1: أمان وأداء

**ZATCA-3 — تشفير `zatca_certificates.private_key`**
المفتاح الخاص مخزّن نصاً. يجب تشفيره بـ `pgp_sym_encrypt` عبر trigger مماثل لـ `encrypt_beneficiary_pii`.

```sql
-- Trigger يُشفّر private_key قبل INSERT/UPDATE
CREATE FUNCTION encrypt_zatca_private_key() ... 
  NEW.private_key := encode(extensions.pgp_sym_encrypt(NEW.private_key, v_key), 'base64');
```

**SEC-2 — تمويه الحقول الحرة في `audit_trigger_func`**
تمويه حقول `notes`, `description`, `resolution_notes` في `old_data`/`new_data` لمنع تسريب PII عرضي. إضافة دالة مساعدة `mask_audit_fields(jsonb)` تُزيل أو تُقنّع الحقول النصية الحرة.

**PERF-1,2,3 — فهارس مفقودة**
```sql
CREATE INDEX idx_income_fy_date ON income(fiscal_year_id, date);
CREATE INDEX idx_expenses_fy_date ON expenses(fiscal_year_id, date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_audit_log_table_date ON audit_log(table_name, created_at);
```

**PERF-4 — `has_role` optimization**
إضافة `PARALLEL SAFE` لأن الدالة `STABLE` ولا تكتب.

### Migration 2: beneficiaries_safe توحيد نهائي

**M-6**: يوجد تعارض بين migration `20260314025643` (`security_invoker=true`) و `20260314035051` (بدون `security_invoker`). الأخيرة تفوز لكن يجب التأكد من أن السلوك المطلوب هو SECURITY DEFINER (تجاوز RLS لأن العرض يُقنّع PII).

إضافة migration تأكيدي صريح:
```sql
ALTER VIEW public.beneficiaries_safe SET (security_invoker = false);
-- SECURITY DEFINER مقصود: العرض يُقنّع PII ذاتياً
```

### لا تغيير مطلوب

- **M-2** (pg_cron): قرار معماري — Supabase يديره تلقائياً
- **SEC-1** (CSP): يحتاج تغيير في إعداد النشر/nginx، ليس في الكود
- **SEC-3** (WebAuthn): خطر منخفض — الاستطلاع يتطلب معرفة user_id
- **SEC-4** (rate_limits cleanup): خطر منخفض
- **SEC-5** (zatca_xml): منخفض الأولوية — النص مطلوب للتدقيق
- **ZATCA-1**: تم حلها بـ advisory lock (كافٍ وأفضل من sequence في هذا السياق)
- **ZATCA-2,4,5**: تحسينات مستقبلية
- **UX-1..7**: تحسينات واجهة مستخدم مستقبلية
- **CI-1..5**: تحسينات CI/CD مستقبلية

## الملفات المتأثرة

```text
supabase/migrations/NEW.sql
├─ CREATE FUNCTION encrypt_zatca_private_key() + TRIGGER
├─ CREATE FUNCTION mask_audit_fields(jsonb) 
├─ CREATE OR REPLACE audit_trigger_func (with masking)
├─ CREATE INDEX ×4 (income, expenses, notifications, audit_log)
├─ ALTER FUNCTION has_role PARALLEL SAFE
└─ ALTER VIEW beneficiaries_safe SET (security_invoker = false)
```

لا تغييرات على ملفات TypeScript.

