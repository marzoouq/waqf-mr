

# فحص الامتثال مع مواصفات ZATCA Sandbox API v2.1.0

بعد مقارنة الكود الحالي مع نموذج الفاتورة المرفق في مواصفات Sandbox ومتطلبات الـ API، تم اكتشاف **5 فجوات حرجة** تمنع قبول الفواتير.

---

## الفجوات المكتشفة

### 1. XPath Transform مفقود — استثناء QR (حرج)
**الملف**: `zatca-signer/index.ts` سطر 324-330

النموذج الرسمي يتضمن **4 transforms** في `ds:Reference`:
```text
1. not(//ancestor-or-self::ext:UBLExtensions)
2. not(//ancestor-or-self::cac:Signature)
3. not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])  ← مفقود!
4. http://www.w3.org/2006/12/xml-c14n11
```
الكود الحالي يحتوي على 3 فقط (بدون استثناء QR). هذا يعني أن الهاش سيختلف عن المتوقع → خطأ `invalid-invoice-hash`.

### 2. schemeID مفقودة على عناصر TaxCategory و TaxScheme (حرج)
**الملف**: `zatca-xml-generator/index.ts`

النموذج الرسمي:
```xml
<cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">S</cbc:ID>
<cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>
```
الكود الحالي:
```xml
<cbc:ID>${vatCategoryCode}</cbc:ID>
<cbc:ID>VAT</cbc:ID>
```
بدون schemeID، سيفشل XSD validation مع خطأ `XSD_ZATCA_INVALID`.

### 3. تنسيق Percent — عدد عشري مطلوب (متوسط)
النموذج: `<cbc:Percent>15.00</cbc:Percent>`
الكود: `<cbc:Percent>${vatRate}</cbc:Percent>` → ينتج `15` بدون كسور عشرية.
قد يسبب خطأ EN 16931 validation (`BR-CO-17`).

### 4. AllowanceCharge مفقود (متوسط)
النموذج الرسمي يتضمن `<cac:AllowanceCharge>` حتى لو القيمة 0.00. غيابه قد يسبب تحذيرات.

### 5. AllowanceTotalAmount و PrepaidAmount مفقودان (متوسط)
النموذج يتضمن في `LegalMonetaryTotal`:
```xml
<cbc:AllowanceTotalAmount currencyID="SAR">0.00</cbc:AllowanceTotalAmount>
<cbc:PrepaidAmount currencyID="SAR">0.00</cbc:PrepaidAmount>
```
الكود الحالي لا يشملهما.

---

## خطة الإصلاح

| # | الملف | التغيير | الأولوية |
|---|---|---|---|
| 1 | `zatca-signer/index.ts` | إضافة Transform ثالث لاستثناء QR في `buildXmlDsig` | حرج |
| 2 | `zatca-xml-generator/index.ts` | إضافة `schemeID="UN/ECE 5305" schemeAgencyID="6"` على كل TaxCategory ID | حرج |
| 3 | `zatca-xml-generator/index.ts` | إضافة `schemeID="UN/ECE 5153" schemeAgencyID="6"` على كل TaxScheme ID | حرج |
| 4 | `zatca-xml-generator/index.ts` | تغيير `${vatRate}` إلى `${Number(vatRate).toFixed(2)}` | متوسط |
| 5 | `zatca-xml-generator/index.ts` | إضافة `<cac:AllowanceCharge>` section مع قيمة 0.00 | متوسط |
| 6 | `zatca-xml-generator/index.ts` | إضافة `AllowanceTotalAmount` و `PrepaidAmount` في LegalMonetaryTotal | متوسط |
| 7 | `zatca-signer/index.ts` | تحديث منطق حساب Invoice Digest ليستثني QR كما في Transforms | حرج |

### تفاصيل البند 1 و 7 (الأهم):
في `buildXmlDsig`، إضافة Transform ثالث:
```xml
<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
  <ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath>
</ds:Transform>
```

وفي حساب `invoiceDigest` (سطر 607-611)، يجب أيضاً إزالة `AdditionalDocumentReference` الخاص بـ QR من XML قبل الهاش:
```typescript
xmlForHash = xmlForHash.replace(
  /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g, ""
);
```

هذا يضمن تطابق الهاش مع ما تتوقعه ZATCA عند التحقق.

