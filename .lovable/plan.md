

## نتائج فحص AI Pentest

تم تشغيل الفحص الأمني بنجاح. النتائج: **6 نتائج** — منها **4 موجودة سابقاً ومُتجاهلة بمبررات**، و**2 جديدة** تحتاج معالجة:

### النتائج الموجودة سابقاً (لا تحتاج إجراء)

| النتيجة | المستوى | الحالة |
|---------|---------|--------|
| `SUPA_security_definer_view` (×2) | error | متجاهلة سابقاً ✓ |
| `SUPA_extension_in_public` | warn | متجاهلة سابقاً ✓ |
| `beneficiaries_safe` — EXPOSED_SENSITIVE_DATA | error | متجاهلة سابقاً ✓ |

### النتائج الجديدة

#### 1. `contracts_safe` — بيانات المستأجرين بدون تحكم وصول (ERROR)

**ما يقوله الماسح:** العرض يكشف بيانات حساسة (رقم هوية، رقم ضريبي، سجل تجاري) بدون RLS.

**التحقق الفعلي:** العرض يستخدم `security_invoker=true` + `security_barrier=true` (مؤكّد من قاعدة البيانات). هذا يعني أن RLS من جدول `contracts` الأساسي تُطبّق تلقائياً. بالإضافة إلى تقنيع PII عبر `CASE WHEN` لغير admin/accountant.

**التقييم:** إيجابية زائفة — نفس نمط `beneficiaries_safe`. سيتم تسجيلها كمتجاهلة.

#### 2. `invoice_items` — وصول من سنوات مالية غير منشورة (WARN)

**ما يقوله الماسح:** جدول `invoice_items` متاح لأدوار beneficiary و waqif لكنه يفتقر لسياسة RESTRICTIVE للسنة المالية الموجودة في `invoices` و `payment_invoices`.

**التحقق الفعلي:**
- `invoices` و `payment_invoices` لديهما سياسة RESTRICTIVE: `is_fiscal_year_accessible(fiscal_year_id)`
- `invoice_items` لديه SELECT مفتوح لـ beneficiary/waqif بدون تقييد السنة المالية
- `invoice_items` لا يحتوي على عمود `fiscal_year_id` — يرتبط بالسنة المالية عبر `invoice_id` → `invoices.fiscal_year_id`

**التقييم:** ثغرة حقيقية. مستفيد يمكنه — نظرياً — الاستعلام عن `invoice_items` مباشرة باستخدام `invoice_id` من سنة مالية غير منشورة.

### خطة الإصلاح

**الخطوة 1:** إضافة سياسة RLS تقييدية (RESTRICTIVE) على `invoice_items` تتحقق من أن السنة المالية المرتبطة منشورة:

```sql
CREATE POLICY "Restrict unpublished fiscal year data on invoice_items"
ON public.invoice_items
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND invoice_items.invoice_source = 'invoices'
    AND is_fiscal_year_accessible(i.fiscal_year_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.payment_invoices pi
    WHERE pi.id = invoice_items.invoice_id
    AND invoice_items.invoice_source = 'payment_invoices'
    AND is_fiscal_year_accessible(pi.fiscal_year_id)
  )
);
```

**الخطوة 2:** تسجيل نتيجة `contracts_safe` كمتجاهلة (إيجابية زائفة — `security_invoker=true`).

