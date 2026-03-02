

# تحديث الوثائق — خطة شاملة

## الملفات المطلوب تحديثها (7 ملفات)

---

### 1. `.lovable/plan.md` — تنظيف
- حذف محتوى الخطة القديمة (إصلاح الـ 3 مشاكل) واستبداله بملخص الحالة الحالية المستقرة
- وفقاً لسياسة "تطهير الوثائق" المعتمدة

---

### 2. `docs/CHANGELOG.md` — إضافة التحديثات الأخيرة
إضافة مدخلين جديدين:

**2026-03-02 — إصلاحات قاعدة البيانات:**
- إصلاح `beneficiaries_safe`: المحاسب يرى البيانات الشخصية الكاملة (الهوية/البنك) بدون تقنيع
- إصلاح `validate_advance_request_amount`: حساب تناسبي بمجموع النسب الفعلي بدل القسمة على 100
- إصلاح `cron_check_late_payments`: تحديد سقف الحساب بتاريخ نهاية العقد

**2026-03-02 — تنظيم الواجهة:**
- تنظيم صفحة الفواتير: فلاتر النوع والحالة، شريط أدوات موحد، عرض بطاقات للجوال

---

### 3. `docs/INDEX.md` — تحديث الأرقام والإحصائيات
| البند | القيمة القديمة | القيمة الجديدة |
|-------|---------------|---------------|
| الجداول/العروض | 24 | 28 (إضافة: `payment_invoices`, `contract_fiscal_allocations`, `rate_limits`, + `beneficiaries_safe` محدّث) |
| الدوال | 25 | 32 |
| Edge Functions | 8 | 9 (إضافة `auth-email-hook`) |
| النطاق | - | إضافة `waqf-wise.net` |

---

### 4. `docs/DATABASE.md` — إضافة الجداول والدوال الجديدة

#### جداول جديدة (3):
- **`payment_invoices`** — فواتير الدفعات (contract_id, fiscal_year_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, notes)
- **`contract_fiscal_allocations`** — تخصيص العقود عبر السنوات المالية (contract_id, fiscal_year_id, period_start, period_end, allocated_payments, allocated_amount)
- **`rate_limits`** — حدود معدل الطلبات (key, count, window_start)

#### دوال جديدة (11):
- `generate_contract_invoices` — توليد فواتير دفعات العقد
- `generate_all_active_invoices` — توليد فواتير جميع العقود النشطة
- `validate_advance_request_amount` — التحقق من صحة مبلغ طلب السلفة (تناسبي)
- `encrypt_beneficiary_pii` — تشفير بيانات المستفيد الحساسة (trigger)
- `pay_invoice_and_record_collection` — دفع فاتورة وتسجيل التحصيل
- `unpay_invoice_and_revert_collection` — إلغاء دفع فاتورة
- `upsert_tenant_payment` — إنشاء/تحديث سجل دفعات المستأجر
- `check_rate_limit` — فحص حد معدل الطلبات
- `cron_update_overdue_invoices` — تحديث الفواتير المتأخرة
- `sync_unit_status_on_contract_change` — مزامنة حالة الوحدة عند تغيير العقد
- `enforce_single_active_fy` — منع وجود أكثر من سنة مالية نشطة

#### تحديث عرض `beneficiaries_safe`:
- إضافة ملاحظة أن المحاسب يرى البيانات الكاملة (الهوية والحساب البنكي) كالناظر

#### تحديث جدول ERD:
- إضافة `payment_invoices` و `contract_fiscal_allocations` و `rate_limits` للمخطط

#### تحديث عدد الدوال في العنوان:
- من 25 إلى 32 دالة

---

### 5. `docs/FINAL-AUDIT-REPORT.md` — إضافة الإصلاحات الأخيرة
- إضافة 3 إصلاحات جديدة لقسم "الإصلاحات المالية":
  - حصة المحاسب في `beneficiaries_safe`
  - حساب تناسبي في `validate_advance`
  - سقف `end_date` في `cron_check_late_payments`
- تحديث العدد الإجمالي من 43 إلى 46 مشكلة مُصلحة

---

### 6. `docs/API.md` — إضافة الوظائف المفقودة
- إضافة توثيق `webauthn` Edge Function (المصادقة البيومترية)
- إضافة توثيق `auth-email-hook` (قوالب البريد المخصصة)
- تحديث العنوان من 8 إلى 9 وظائف (auth-email-hook هو hook وليس وظيفة عامة، لكنه موجود في المجلد)

---

### 7. `docs/BENEFICIARY-PAGES.md` — تحديث طفيف
- تحديث معادلة حساب حصة المستفيد لتعكس الحساب التناسبي:
  - من: `availableAmount * share_percentage / 100`
  - إلى: `availableAmount * share_percentage / totalBeneficiaryPercentage`

---

## ملخص التغييرات

| الملف | نوع التغيير |
|-------|------------|
| `.lovable/plan.md` | تنظيف — حالة مستقرة |
| `docs/CHANGELOG.md` | إضافة مدخلين جديدين |
| `docs/INDEX.md` | تحديث أرقام وإحصائيات |
| `docs/DATABASE.md` | إضافة 3 جداول + 11 دالة + تحديث ERD |
| `docs/FINAL-AUDIT-REPORT.md` | إضافة 3 إصلاحات |
| `docs/API.md` | إضافة 2 وظيفة |
| `docs/BENEFICIARY-PAGES.md` | تحديث معادلة الحصة |

لا توجد تغييرات في الكود أو قاعدة البيانات — توثيق فقط.

