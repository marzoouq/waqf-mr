

# خطة: إضافة زر فحص الامتثال (Compliance Check) + التحقق من منطق الضريبة

## ملخص التحليل

### ما هو موجود فعلاً
- **Backend**: `action === "compliance-check"` جاهز في `zatca-api/index.ts` (سطر 314-376) — يرسل فاتورة موقّعة إلى `/compliance/invoices`
- **UI**: لا يوجد زر compliance-check في الواجهة — الزر مفقود تماماً
- **VAT Logic**: `vat_rate` يُحدد عند توليد الفواتير عبر `generate_contract_invoices` RPC (في قاعدة البيانات). XML Generator يقرأ `vat_rate` من الفاتورة ويحدد `getVatCategoryCode()`: إذا `> 0` → `S` (خاضعة 15%)، وإلا → `E` (معفاة). هذا صحيح للإيجار السكني (معفاة) والتجاري (15%).

### ما يحتاج تنفيذ

## التغييرات المطلوبة

### 1. إضافة زر "فحص الامتثال" في ZatcaManagementPage

**الملف**: `src/pages/dashboard/ZatcaManagementPage.tsx`

- إضافة mutation جديد `complianceCheck` يستدعي `zatca-api` مع `action: "compliance-check"`
- إضافة زر في تبويب "الشهادات" بين Onboarding وProduction:
  - يظهر فقط عندما تكون الشهادة النشطة من نوع `compliance`
  - يتطلب اختيار فاتورة موقّعة (أو يعمل على فاتورة محددة)
- إضافة زر "فحص امتثال" في صف كل فاتورة (بعد التوقيع وقبل الإرسال) — يظهر فقط إذا الشهادة compliance
- عرض نتيجة الفحص في toast أو dialog

**تصميم الدورة الكاملة في الشهادات:**
```text
Onboarding → فحص الامتثال (6 فواتير) → ترقية للإنتاج → إرسال/اعتماد
```

- في تبويب الشهادات، إضافة:
  - زر "فحص امتثال" (بين Onboarding وProduction) — يُفعَّل فقط مع شهادة compliance نشطة
  - زر "ترقية للإنتاج" — يُفعَّل فقط مع شهادة compliance نشطة

### 2. إضافة زر فحص الامتثال في جدول الفواتير

- في عمود الإجراءات، إضافة زر "فحص" بأيقونة `CheckCircle`
- الشروط: `hasXml && hasSig && !isSubmitted && activeCert?.certificate_type === 'compliance'`
- يظهر بلون مختلف (variant="secondary") للتمييز عن الإرسال

### 3. إضافة زر الترقية للإنتاج

- في تبويب الشهادات، إضافة زر "ترقية للإنتاج" مع AlertDialog
- يُفعَّل فقط إذا الشهادة النشطة compliance
- يستدعي `zatca-api` مع `action: "production"`

### 4. عرض نتيجة فحص الامتثال

- إضافة Dialog يعرض تفاصيل الرد من ZATCA (validationResults, warningMessages, errorMessages)

## التفاصيل التقنية

**الضريبة والإيجار**: النظام يتعامل صحيحياً مع الفرق:
- الإيجار السكني: `vat_rate = 0` → VAT Category `E` (معفاة)
- الإيجار التجاري: `vat_rate = 15` → VAT Category `S` (خاضعة)
- هذا يُحدد عند توليد الفواتير في `generate_contract_invoices` RPC بناءً على نوع العقار

**المسارات المستخدمة**: جميعها مطابقة للمواصفات:
- `POST /compliance` — Onboarding ✅
- `POST /compliance/invoices` — فحص الامتثال ✅ (backend جاهز)
- `POST /production/csids` — ترقية ✅
- `POST /invoices/reporting/single` — إبلاغ ✅
- `POST /invoices/clearance/single` — اعتماد ✅

