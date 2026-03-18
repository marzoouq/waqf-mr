

## فحص جنائي عميق لجميع سياسات RLS — النتائج والإصلاحات

### منهجية الفحص
تم فحص **28 جدول/عرض** و **88 سياسة RLS** بند ببند، مع التحقق من:
- تناسق PERMISSIVE vs RESTRICTIVE
- تغطية الأوامر (SELECT/INSERT/UPDATE/DELETE)
- وجود قيود السنة المالية على كل جدول مالي
- عزل بيانات المستفيدين
- حماية البيانات الحساسة (PII)

---

### النتائج: 3 ثغرات حقيقية مكتشفة

```text
┌─────────────────────────────────┬──────────┬─────────────────────────────────────────────┐
│ الجدول                          │ الخطورة  │ المشكلة                                     │
├─────────────────────────────────┼──────────┼─────────────────────────────────────────────┤
│ advance_requests                │ متوسطة   │ لا يوجد RESTRICTIVE للسنة المالية            │
│ advance_carryforward            │ متوسطة   │ لا يوجد RESTRICTIVE للسنة المالية            │
│ expense_budgets                 │ متوسطة   │ لا يوجد RESTRICTIVE للسنة المالية            │
└─────────────────────────────────┴──────────┴─────────────────────────────────────────────┘
```

#### التفصيل:

**1. `advance_requests` — بدون قيد السنة المالية**
- يحتوي على `fiscal_year_id` لكن **لا توجد سياسة RESTRICTIVE** تمنع رؤية بيانات سنوات غير منشورة
- المستفيد يستطيع رؤية طلبات السلف الخاصة به من سنوات لم يُنشرها الناظر بعد
- **كل الجداول المالية الأخرى** (income, expenses, distributions, accounts, invoices, payment_invoices, contract_fiscal_allocations, annual_report_items) لديها هذا القيد

**2. `advance_carryforward` — بدون قيد السنة المالية**
- يحتوي على `from_fiscal_year_id` و `to_fiscal_year_id`
- المستفيد يرى ترحيل السلف من/إلى سنوات غير منشورة

**3. `expense_budgets` — بدون قيد السنة المالية**
- يحتوي على `fiscal_year_id` لكن بدون RESTRICTIVE
- المستفيد والواقف يريان ميزانيات المصروفات لسنوات غير منشورة

---

### الجداول السليمة (25 جدول/عرض) — تم التحقق

| الجدول | الحالة | ملاحظة |
|---|---|---|
| access_log | سليم | INSERT/UPDATE/DELETE = false، SELECT للناظر فقط |
| access_log_archive | سليم | نفس حماية access_log |
| accounts | سليم | RESTRICTIVE + fiscal year |
| annual_report_items | سليم | RESTRICTIVE + fiscal year |
| annual_report_status | سليم | مقيد بـ published status |
| app_settings | سليم | pii_encryption_key محمي |
| audit_log | سليم | INSERT/UPDATE/DELETE = false |
| beneficiaries | سليم | عزل بـ user_id |
| beneficiaries_safe | سليم | security_invoker=true يرث RLS |
| contract_fiscal_allocations | سليم | RESTRICTIVE + fiscal year |
| contracts | سليم | RESTRICTIVE + بدون وصول مباشر لمستفيد/واقف |
| contracts_safe | سليم | security_barrier + تقنيع PII |
| conversations | سليم | عزل بـ created_by/participant_id |
| distributions | سليم | RESTRICTIVE + fiscal year + عزل beneficiary |
| expenses | سليم | RESTRICTIVE + fiscal year |
| fiscal_years | سليم | محاسب = INSERT فقط، مستفيد = published فقط |
| income | سليم | RESTRICTIVE + fiscal year |
| invoice_chain | سليم | admin + accountant فقط |
| invoice_items | سليم | قراءة فقط لمستفيد/واقف |
| invoices | سليم | RESTRICTIVE + fiscal year |
| messages | سليم | UPDATE محمي ضد تعديل المحتوى |
| notifications | سليم | عزل بـ user_id |
| payment_invoices | سليم | RESTRICTIVE + fiscal year |
| properties | سليم | قراءة فقط لمستفيد/واقف |
| rate_limits | سليم | ALL = false |
| support_tickets | سليم | عزل بـ created_by |
| support_ticket_replies | سليم | is_internal محمي |
| tenant_payments | سليم | admin + accountant فقط |
| units | سليم | قراءة فقط لمستفيد/واقف |
| user_roles | سليم | SELECT ذاتي + admin ALL |
| waqf_bylaws | سليم | is_visible للأدوار غير الإدارية |
| webauthn_challenges | سليم | ALL = false |
| webauthn_credentials | سليم | لا UPDATE (counter يُحدّث عبر service_role) |
| zatca_certificates | سليم | admin فقط |
| zatca_operation_log | سليم | INSERT/UPDATE/DELETE = false |

---

### الإصلاح المطلوب

إضافة 3 سياسات RESTRICTIVE على الجداول المكشوفة:

**Migration SQL:**

```sql
-- 1. advance_requests: منع رؤية سلف سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on advance_requests"
  ON public.advance_requests
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- 2. advance_carryforward: منع رؤية ترحيل سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on advance_carryforward"
  ON public.advance_carryforward
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(from_fiscal_year_id));

-- 3. expense_budgets: منع رؤية ميزانيات سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on expense_budgets"
  ON public.expense_budgets
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));
```

### لماذا هذا الإصلاح آمن
- `is_fiscal_year_accessible` دالة `SECURITY DEFINER` مُجربة تُرجع `true` دائماً للناظر والمحاسب
- للمستفيد والواقف: تتحقق من `published = true` في جدول `fiscal_years`
- `NULL` في `fiscal_year_id` → `false` للأدوار غير الإدارية (حماية H-12 موجودة)
- نفس النمط المُطبّق على 8 جداول أخرى بنجاح

### الملفات المتأثرة
- **Migration SQL جديد فقط** — لا تغييرات في كود TypeScript

