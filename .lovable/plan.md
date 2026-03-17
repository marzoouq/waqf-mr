

# خطة التنفيذ المُعدّلة: AllowanceCharge + بنود متعددة + نظام قوالب احترافي

> **تأكيد نطاق العمل:** النظام مختص حصرياً بـ **التأجير العقاري وإدارة الأوقاف/الأملاك**. لا يوجد أي نظام بيع أو شراء. جميع الفواتير والبنود تتعلق بخدمات إيجارية (إيجار، صيانة، مرافق).

---

## المهمة 1: دعم AllowanceCharge + Multi-line Items في XML Generator

**الملف:** `supabase/functions/zatca-xml-generator/index.ts`

**الوضع الحالي:** بند واحد ثابت (`InvoiceLine` واحد بـ `unitCode="MON"` وكمية 1)، بدون AllowanceCharge.

**التعديلات:**

1. **بنود متعددة:** إضافة دعم `inv.line_items` كمصفوفة اختيارية. كل بند يحتوي على (الوصف، الكمية، سعر الوحدة، نسبة الضريبة، كود الوحدة). إذا لم توجد المصفوفة، يبقى السلوك الحالي (بند إيجار واحد) كـ fallback.
   - أكواد الوحدات تبقى خاصة بالتأجير: `MON` (شهر)، `DAY` (يوم)، `EA` (وحدة خدمة)
   - أسماء البنود الافتراضية: "إيجار عقاري"، "صيانة"، "خدمات مرافق"

2. **AllowanceCharge على مستوى الفاتورة:** إضافة `inv.allowances[]` و `inv.charges[]` اختيارية:
   - `<cac:AllowanceCharge>` مع `<cbc:ChargeIndicator>false` للخصومات (مثل: خصم تعاقدي، خصم سداد مبكر)
   - `<cbc:ChargeIndicator>true` للرسوم الإضافية (مثل: رسوم تأخير سداد)
   - تحديث `LegalMonetaryTotal` بـ `AllowanceTotalAmount` و `ChargeTotalAmount`

3. **تجميع TaxTotal:** عند وجود بنود بمعدلات ضريبية مختلفة، تجميع `TaxSubtotal` لكل فئة VAT.

---

## المهمة 2: نظام قوالب فواتير متعدد

**ملف جديد:** `src/components/invoices/InvoiceTemplates.tsx`

قالبان مخصصان لنشاط **التأجير وإدارة الأملاك**:

### القالب الاحترافي (Standard B2B)
- ترويسة خضراء مع شعار المنشأة + "فاتورة ضريبية"
- بيانات البائع (الوقف/المالك) كاملة
- بيانات المشتري/المستأجر التفصيلية (اسم، عنوان، رقم ضريبي، سجل تجاري)
- جدول بنود تفصيلي مع أعمدة الخصومات/الرسوم
- قسم إجماليات مفصل (قبل الضريبة، خصومات، رسوم، ضريبة، الإجمالي)
- QR كبير + بيانات ZATCA (UUID، ICV)

### القالب المبسط (Simplified B2C)
- تصميم مختصر مع "فاتورة ضريبية مبسطة"
- بائع فقط، بدون بيانات مستأجر تفصيلية
- جدول بنود مختصر
- QR مركزي أكبر

### TemplateSelector
- مكون تبديل بين القالبين بأزرار في أعلى المعاينة

---

## المهمة 3: تحسين InvoicePreviewDialog + تكامل القوالب

**الملفات:** `InvoicePreviewDialog.tsx` + `InvoicesPage.tsx`

1. إضافة حقول `allowances` و `charges` إلى `InvoicePreviewData`
2. دمج `TemplateSelector` + `ProfessionalTemplate` / `SimplifiedTemplate` داخل الـ Dialog
3. تحديث `buildPreviewData()` في `InvoicesPage` لتمرير بيانات الخصومات/الرسوم
4. تحديث حسابات الإجماليات لتشمل الخصومات والرسوم
5. مؤشرات أحمر للحقول الإلزامية الناقصة (VAT المشتري للقياسية)

---

## المهمة 4: تحديث CreateInvoiceFromTemplate

إضافة حقول الخصومات والرسوم الإضافية في نموذج إنشاء الفاتورة من القالب، مع ربطها بالمعاينة الفورية.

---

## ملخص الملفات

| الملف | العملية |
|-------|---------|
| `supabase/functions/zatca-xml-generator/index.ts` | تعديل (AllowanceCharge + Multi-line) |
| `src/components/invoices/InvoiceTemplates.tsx` | إنشاء جديد |
| `src/components/invoices/InvoicePreviewDialog.tsx` | تعديل (تكامل القوالب) |
| `src/components/invoices/CreateInvoiceFromTemplate.tsx` | تعديل (خصومات/رسوم) |
| `src/pages/dashboard/InvoicesPage.tsx` | تعديل طفيف |

