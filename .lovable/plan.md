

# تقرير فحص قاعدة البيانات الشامل — الهيكل والعلاقات وسلامة البيانات

---

## ملخص تنفيذي

قاعدة البيانات تحتوي على **37 جدول** + **2 views** + **~30 trigger** + **~40 function** عبر **231 ملف ترحيل**. الهيكل العام **منظم وسليم** مع بعض الملاحظات التفصيلية.

---

## 1. خريطة الجداول والعلاقات

```text
┌─────────────────────────────────────────────────────────────┐
│                    auth.users (Supabase)                      │
│                         ↑                                     │
│              user_id FK │                                     │
├──────────┬──────────────┼──────────────┬────────────────────┤
│user_roles│beneficiaries │notifications │webauthn_credentials│
│          │    ↑         │              │                    │
│          │    │ beneficiary_id         │                    │
│          │    ├─── distributions       │                    │
│          │    ├─── advance_requests    │                    │
│          │    └─── advance_carryforward│                    │
├──────────┴──────────────┴──────────────┴────────────────────┤
│                                                              │
│  fiscal_years ←── accounts ←── distributions                 │
│       ↑            ↑                                         │
│       │            │ fiscal_year_id                           │
│       ├── income   ├── expenses   ├── invoices               │
│       ├── contracts ├── payment_invoices                      │
│       ├── contract_fiscal_allocations                        │
│       ├── expense_budgets                                    │
│       ├── annual_report_items / annual_report_status         │
│       └── advance_carryforward (from/to)                     │
│                                                              │
│  properties ←── units ←── contracts                          │
│       ↑                      ↑                               │
│       │                      ├── tenant_payments             │
│       │                      ├── payment_invoices            │
│       └── income, expenses   └── income                      │
│                                                              │
│  invoice_chain (polymorphic FK → invoices | payment_invoices)│
│  invoice_items (polymorphic FK → invoices | payment_invoices)│
│                                                              │
│  support_tickets ←── support_ticket_replies                  │
│  conversations ←── messages                                  │
│  zatca_certificates (standalone)                             │
│  waqf_bylaws (standalone)                                    │
│  account_categories (self-referencing tree)                  │
│  app_settings (standalone KV)                                │
│  rate_limits (standalone)                                    │
│  access_log / access_log_archive (standalone)                │
│  audit_log (standalone — populated by triggers)              │
├──────────────────────────────────────────────────────────────┤
│  VIEWS: beneficiaries_safe, contracts_safe                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. المفاتيح الأجنبية (Foreign Keys) — ✅ شاملة

تم تعريف **29 قيد FK** في ترحيل مركزي (`20260316015307`) مع سياسات ON DELETE مدروسة:

| السياسة | الاستخدام |
|---------|-----------|
| `CASCADE` | حذف العقد → حذف فواتيره وتخصيصاته |
| `SET NULL` | حذف السنة المالية → لا يحذف البيانات المالية |
| `RESTRICT` (default) | حذف عقار له عقود → مرفوض |

**⚠️ ملاحظة 1: عدم تناسق ON DELETE لـ `fiscal_year_id`**

بعض الجداول تستخدم `ON DELETE SET NULL` للـ `fiscal_year_id` رغم أن العمود **NOT NULL**:

| الجدول | العمود | Nullable | ON DELETE |
|--------|--------|----------|----------|
| `income` | `fiscal_year_id` | **NOT NULL** | SET NULL ❌ |
| `expenses` | `fiscal_year_id` | **NOT NULL** | SET NULL ❌ |
| `distributions` | `fiscal_year_id` | **NOT NULL** | SET NULL ❌ |
| `accounts` | `fiscal_year_id` | **NOT NULL** | SET NULL ❌ |
| `payment_invoices` | `fiscal_year_id` | Nullable | SET NULL ✅ |

**المشكلة:** إذا حُذفت سنة مالية، `SET NULL` سيفشل لأن العمود NOT NULL — مما يعني أن الحذف سيُرفض فعلياً (نفس سلوك RESTRICT). هذا ليس bug عملي لكنه **تناقض تصريحي** يجب تنظيفه إما بتغيير ON DELETE إلى RESTRICT أو إبقاء SET NULL مع جعل العمود nullable.

**التوصية:** تغيير ON DELETE إلى `RESTRICT` للأعمدة NOT NULL (يعكس السلوك الفعلي بوضوح).

---

## 3. Polymorphic FKs — ⚠️ ملاحظة

`invoice_chain` و `invoice_items` تستخدمان **polymorphic FK** عبر `source_table` column:
- `invoice_id` يشير إلى `invoices.id` أو `payment_invoices.id` حسب قيمة `source_table`
- **لا يوجد FK constraint فعلي** على `invoice_id` — التحقق يتم عبر trigger

هذا نمط مقبول لكنه يعني أن سلامة البيانات تعتمد على الـ trigger فقط. إذا تم تعطيل الـ trigger أو إدخال بيانات مباشرة، قد تنشأ أيتام (orphans).

---

## 4. جداول بدون FK references — ✅ مقصود

| الجدول | السبب |
|--------|-------|
| `notifications` | `user_id` بدون FK constraint لـ `auth.users` — **صحيح** (لا يجوز FK لـ auth schema) |
| `access_log` | standalone — مقصود |
| `rate_limits` | standalone KV — مقصود |
| `zatca_certificates` | standalone — مقصود |
| `waqf_bylaws` | standalone — مقصود |
| `app_settings` | standalone KV — مقصود |
| `webauthn_credentials` | `user_id` بدون FK لـ auth.users — **صحيح** |

---

## 5. جداول مكررة أو غير مستخدمة — ✅ لا يوجد

| الجدول | مستخدم في الكود | التقييم |
|--------|-----------------|---------|
| `invoices` | ✅ ZatcaManagementPage, InvoiceViewer | فواتير يدوية |
| `payment_invoices` | ✅ عبر generate_contract_invoices | فواتير تلقائية من العقود |
| `invoice_chain` | ✅ ZatcaManagementPage | سلسلة ZATCA |
| `invoice_items` | ✅ InvoiceViewer | بنود الفاتورة |
| `audit_log` | ✅ AuditLogPage | مملوء عبر triggers |
| `access_log` | ✅ عبر log_access_event RPC | سجل الدخول |
| `access_log_archive` | ✅ عبر cron_archive_old_access_logs | أرشيف تلقائي |

**لا توجد جداول غير مستخدمة أو مكررة.**

---

## 6. Triggers — ✅ شاملة ومنظمة

| النوع | العدد | الجداول المغطاة |
|-------|-------|----------------|
| Audit triggers | 10 | accounts, income, expenses, contracts, beneficiaries, distributions, properties, units, fiscal_years, payment_invoices |
| Fiscal year protection | 5 | income, expenses, invoices, distributions, payment_invoices |
| Validation triggers | 4 | advance_requests, payment_invoices VAT, invoices VAT, account_categories |
| Auto-sync triggers | 3 | unit status, conversation timestamp, support ticket timestamp |
| Auto-set triggers | 1 | distribution fiscal_year from account |
| updated_at triggers | 3+ | payment_invoices, waqf_bylaws, support_tickets |

---

## 7. Views — ✅ آمنة

| View | النوع | الأمان |
|------|-------|--------|
| `beneficiaries_safe` | SECURITY DEFINER + BARRIER | ✅ PII masking بالأدوار |
| `contracts_safe` | SECURITY DEFINER + BARRIER | ✅ PII masking بالأدوار |

---

## 8. سلامة البيانات (Data Integrity)

| البند | الحالة |
|-------|--------|
| RLS على جميع الجداول | ✅ 37/37 |
| `is_fiscal_year_accessible` restrictive policy | ✅ على 10 جداول |
| `prevent_closed_fiscal_year_modification` trigger | ✅ على 5 جداول |
| Audit logging | ✅ على 10 جداول أساسية |
| Rate limits table — RLS blocks direct access | ✅ `USING (false)` |
| Access log — immutable (no INSERT/UPDATE/DELETE for users) | ✅ |

---

## 9. التوصيات المرتبة بالأولوية

| # | التوصية | الأولوية | الجهد |
|---|---------|----------|-------|
| 1 | **تنظيف تناقض ON DELETE SET NULL مع NOT NULL** — تغيير FK لـ `income`, `expenses`, `distributions`, `accounts` إلى `ON DELETE RESTRICT` (يعكس السلوك الفعلي) | متوسطة | منخفض — 4 أسطر SQL |
| 2 | **إضافة validation trigger** لـ `invoice_chain.invoice_id` و `invoice_items.invoice_id` للتحقق من وجود السجل في الجدول المحدد بـ `source_table` (إذا لم يكن موجوداً بالفعل) | منخفضة | منخفض |

---

## الخلاصة

قاعدة البيانات في حالة **ممتازة**:
- **37 جدول** مع FK constraints شاملة (29 قيد)
- **لا جداول مكررة أو غير مستخدمة**
- **10 audit triggers** + **5 fiscal year protection triggers**
- **2 views آمنة** بـ SECURITY DEFINER
- **RLS 100%** على جميع الجداول

الملاحظة الوحيدة ذات الأهمية هي **تناقض ON DELETE SET NULL مع أعمدة NOT NULL** — وهو لا يسبب مشكلة عملية (لأن الحذف يُرفض في كلتا الحالتين) لكنه يحتاج تنظيف تصريحي.

