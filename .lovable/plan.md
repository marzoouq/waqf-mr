
# خطة v4 — نظام سندات الصرف الداخلية (Disbursement Vouchers)

## تعديلات هذه النسخة عن v3
- **المستفيد والواقف:** قراءة فقط للسند والاطلاع عليه (بدون تعديل)، ويظهر السند مرتبطاً في عرض المصاريف.
- **حماية PII رغم القراءة:** يُحجب رقم الهوية، الجوال، مرجع التحويل، التوقيع — تبقى مرئية للناظر/المحاسب فقط.

---

## مصفوفة الصلاحيات النهائية

| الإجراء | ناظر | محاسب | مستفيد | واقف |
|---|:-:|:-:|:-:|:-:|
| إنشاء مسودة سند | ✅ | ✅ | ❌ | ❌ |
| اعتماد سند | ✅ | ❌ | ❌ | ❌ |
| إلغاء سند | ✅ | ❌ | ❌ | ❌ |
| توليد/إعادة توليد PDF | ✅ | ✅ | ❌ | ❌ |
| تنزيل PDF (Signed URL) | ✅ | ✅ | ✅ (للمعتمد فقط) | ✅ (للمعتمد فقط) |
| رؤية بيانات المستلم الكاملة (هوية/جوال/توقيع/مرجع تحويل) | ✅ | ✅ | ❌ | ❌ |
| رؤية ملخص السند (رقم، مبلغ، طريقة، وصف الأعمال، اسم المستلم) | ✅ | ✅ | ✅ | ✅ |
| ظهور شارة «موثّق بسند» في صف المصروف | ✅ | ✅ | ✅ | ✅ |
| تعديل سند في سنة مقفلة | ✅ | ❌ | ❌ | ❌ |

---

## 1) قاعدة البيانات

### Bucket خاص (private)
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('disbursement-vouchers', 'disbursement-vouchers', false);
```
**سياسات `storage.objects`:**
- admin/accountant: SELECT/INSERT/UPDATE داخل البكت
- beneficiary/waqif: SELECT داخل البكت إذا كان السند `approved` وسنته منشورة (يطابق `pdf_path`)
- service_role: DELETE

> التنزيل دائماً عبر `createSignedUrl` بصلاحية قصيرة — لا روابط عامة.

### Enums + الجدول
```sql
CREATE TYPE voucher_status AS ENUM ('draft','approved','void');
CREATE TYPE voucher_payment_method AS ENUM ('cash','bank_transfer','cheque','other');

CREATE TABLE public.disbursement_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text NOT NULL UNIQUE,
  expense_id uuid NOT NULL,
  fiscal_year_id uuid NOT NULL,
  recipient_name text NOT NULL,
  recipient_id_number text,      -- محجوب عن beneficiary/waqif
  recipient_phone text,          -- محجوب
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method voucher_payment_method NOT NULL DEFAULT 'cash',
  transfer_reference text,       -- محجوب
  work_description text NOT NULL,
  signature_data text,           -- محجوب
  status voucher_status NOT NULL DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamptz,
  void_reason text,
  voided_at timestamptz,
  pdf_path text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voucher_signature_size
    CHECK (signature_data IS NULL OR octet_length(signature_data) <= 100000),
  CONSTRAINT voucher_approval_consistency
    CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT voucher_void_consistency
    CHECK (status <> 'void' OR (void_reason IS NOT NULL AND voided_at IS NOT NULL))
);

CREATE UNIQUE INDEX disbursement_vouchers_one_active_per_expense
  ON public.disbursement_vouchers(expense_id)
  WHERE status <> 'void';

CREATE SEQUENCE disbursement_voucher_seq;
```

### View الآمن للقراءة (`disbursement_vouchers_public`)
```sql
CREATE VIEW public.disbursement_vouchers_public
WITH (security_invoker = false) AS
SELECT
  id, voucher_number, expense_id, fiscal_year_id,
  recipient_name,           -- مسموح: اسم فقط
  amount, payment_method,
  work_description,
  status, approved_at,
  created_at,
  pdf_path                  -- المسار فقط؛ التنزيل عبر signed URL
FROM public.disbursement_vouchers
WHERE status = 'approved';  -- لا يرى المستفيد المسودات أو الملغاة
```
> اتباع نمط `contracts_safe`: `security_invoker=false` عمداً لإخفاء PII (لتوثيقه في الذاكرة لاحقاً).

### RLS
**جدول `disbursement_vouchers` (خام):**
| Role | Policy |
|---|---|
| admin | ALL |
| accountant | ALL |
| beneficiary/waqif | **No direct SELECT** (`USING(false)`) |
+ RESTRICTIVE: `is_fiscal_year_accessible(fiscal_year_id)`
+ Audit trigger.

**View `disbursement_vouchers_public`:**
- GRANT SELECT للأدوار الأربعة.
- يرث `is_fiscal_year_accessible` من خلال الجدول الخام (لأن `security_invoker=false` يستخدم صلاحيات مالك view — لذا نضيف فلتر `is_fiscal_year_accessible` صريحاً في تعريف الـview).

تعديل تعريف الـview ليكون آمناً:
```sql
... WHERE status = 'approved'
  AND is_fiscal_year_accessible(fiscal_year_id);
```

---

## 2) دوال SQL (SECURITY DEFINER)

### `create_disbursement_voucher(p_expense_id, p_payload jsonb)`
- admin أو accountant.
- منع الازدواجية:
  ```sql
  IF EXISTS (SELECT 1 FROM invoices WHERE expense_id = p_expense_id)
     OR EXISTS (SELECT 1 FROM disbursement_vouchers
                WHERE expense_id = p_expense_id AND status <> 'void')
  THEN RAISE EXCEPTION 'EXPENSE_ALREADY_DOCUMENTED';
  END IF;
  ```
- توليد `SRF-YYYY-000001`، إدراج `draft`.

### `approve_disbursement_voucher(p_voucher_id)` — admin فقط
### `void_disbursement_voucher(p_voucher_id, p_reason)` — admin فقط
### `get_voucher_signed_url(p_voucher_id)` — دالة جديدة
- تتحقق من الدور والوصول للسنة.
- ترجع رابطاً موقّعاً صالحاً 60 ثانية للـ pdf (للمستفيد/الواقف لا يُسمح إلا إذا `status='approved'`).

### حماية مسار الفاتورة الموجود
في trigger/دالة إنشاء `invoices` المرتبطة بـ `expense_id`:
```sql
IF NEW.expense_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM disbursement_vouchers
  WHERE expense_id = NEW.expense_id AND status <> 'void')
THEN RAISE EXCEPTION 'EXPENSE_ALREADY_HAS_VOUCHER';
END IF;
```

---

## 3) Edge Function `generate-voucher-pdf`
- `getUser()` + دور admin/accountant.
- `voucher.status='approved'` فقط.
- يرفع إلى `disbursement-vouchers/{fiscal_year_id}/{voucher_number}.pdf`.
- محتوى PDF (Tajawal/Amiri RTL): شعار، رقم السند، تاريخ، بيانات المستلم، طريقة الدفع، الأعمال المنفذة، المبلغ رقماً وحروفاً، توقيع المستلم، اعتماد الناظر.
- **تذييل إلزامي:** «سند صرف داخلي — ليس فاتورة ضريبية ولا يصلح لاسترداد ضريبة القيمة المضافة».

---

## 4) Frontend

### Hooks جديدة
- `src/hooks/data/financial/useDisbursementVouchers.ts` — admin/accountant عبر `createCrudFactory` (يقرأ من الجدول الخام).
- `src/hooks/data/financial/useDisbursementVouchersPublic.ts` — beneficiary/waqif (يقرأ من view + يستدعي `get_voucher_signed_url` عند الفتح).
- `src/hooks/page/admin/financial/useVoucherFormPage.ts`
- `src/hooks/page/admin/financial/useExpenseDocumentationPage.ts`
- `src/hooks/page/beneficiary/financial/useVoucherViewPage.ts`

### مكونات `src/components/expenses/vouchers/`
| ملف | للأدوار |
|---|---|
| `DocumentationTypeDialog.tsx` | admin/accountant |
| `VoucherFormDialog.tsx` | admin/accountant |
| `VoucherSignatureCanvas.tsx` | admin/accountant |
| `VoucherDetailsCard.tsx` | admin/accountant (كل الحقول) |
| `VoucherPublicCard.tsx` | beneficiary/waqif (بدون PII، زر «تنزيل PDF» يستدعي signed URL) |
| `VouchersTable.tsx` | admin/accountant |
| `VouchersPublicTable.tsx` | beneficiary/waqif |

### تعديل صفحات
- `src/pages/dashboard/ExpensesPage.tsx` (admin): زر «إنشاء توثيق».
- `src/components/expenses/ExpensesDesktopTable.tsx` + `ExpensesMobileCards.tsx`: شارة `none / voucher / zatca_invoice` لكل الأدوار.
- `src/pages/dashboard/InvoicesPage.tsx`: تبويب «سندات الصرف» (admin/accountant).
- `src/pages/beneficiary/ExpensesViewPage.tsx`: شارة + زر «عرض السند» يفتح `VoucherPublicCard` في Dialog.
- `src/pages/beneficiary/InvoicesViewPage.tsx`: تبويب «سندات الصرف» (قراءة من view).
- `src/routes/adminRoutes.tsx` + `src/routes/beneficiaryRoutes.tsx`: مسارات `/dashboard/vouchers/:id` و `/beneficiary/vouchers/:id`.

### ثوابت `src/constants/entities.ts`
```ts
export const VOUCHER_PAYMENT_METHODS = {
  cash: 'نقدي', bank_transfer: 'تحويل بنكي',
  cheque: 'شيك', other: 'أخرى',
} as const;
export const VOUCHER_STATUS_LABELS = {
  draft: 'مسودة', approved: 'معتمد', void: 'ملغي',
} as const;
```

---

## 5) سير العمل

```text
المصروف بلا توثيق
    │
    ▼
"إنشاء توثيق" (محاسب أو ناظر)
    ├── سند داخلي ──► draft ──► اعتماد الناظر ──► PDF ──► متاح للجميع للقراءة
    └── فاتورة ZATCA ──► المسار الحالي
                              │
                              ▼
                  المستفيد/الواقف يرى:
                  - شارة «موثّق بسند» في صف المصروف
                  - بطاقة بدون PII + تنزيل PDF (Signed URL لمدة 60 ثانية)
```

---

## 6) قيود التضارب وعدم الكسر

1. لا استخدام لـ `waqf-assets` — bucket خاص جديد.
2. لا VAT في السند.
3. السنوات المقفلة → admin فقط.
4. مسار ZATCA يبقى كما هو + فحص ازدواجية واحد.
5. PII (هوية/جوال/مرجع تحويل/توقيع) محجوب عن المستفيد/الواقف عبر view آمن + حجب الجدول الخام.
6. تنزيل PDF عبر Signed URL قصير الأمد فقط.
7. `ON DELETE RESTRICT` للمصروف ذي السند النشط.
8. ملفات ≤200 سطر، Page Hook Pattern، ألوان عبر CSS variables.

---

## 7) خارج النطاق
- توقيع بيومتري (WebAuthn) على السند.
- تصدير دفعي شهري.
- جدول وسيط `expense_documents`.
