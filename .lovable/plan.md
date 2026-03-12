

# فحص الامتثال مع قاموس بيانات ZATCA ومتطلبات XML (مايو 2023)

بعد مقارنة تفصيلية للكود الحالي مع المتطلبات الرسمية لقاموس البيانات ومواصفات تنفيذ XML، تم اكتشاف **6 فجوات** تتفاوت في الأهمية.

---

## الحالة الراهنة (مُمتثل)

| العنصر | المرجع | الحالة |
|---|---|---|
| ProfileID = "reporting:1.0" | BT-23 | ✅ |
| InvoiceTypeCode + name attribute | BT-3 / KSA-2 | ✅ |
| ICV + PIH + QR references | KSA-1, KSA-16, KSA-14 | ✅ |
| UBLExtensions + Signature | — | ✅ |
| عنوان البائع كامل (8 حقول) | BT-35..BT-43 | ✅ |
| TaxCategory schemeID | BT-118, BT-151 | ✅ |
| AllowanceCharge + LegalMonetaryTotal | BG-20, BG-22 | ✅ |
| unitCode="MON" | BT-130 | ✅ |
| Note languageID="ar" | BT-22 | ✅ |
| ClearanceStatus header | API v2.1.1 | ✅ |

---

## الفجوات المكتشفة

### 1. BillingReference مفقود للإشعارات الدائنة/المدينة (حرج)
**المرجع**: BG-3 (BT-25 Preceding Invoice Reference)

عند إصدار إشعار دائن (381) أو مدين (383)، ZATCA تتطلب إلزامياً:
```xml
<cac:BillingReference>
  <cac:InvoiceDocumentReference>
    <cbc:ID>رقم الفاتورة الأصلية</cbc:ID>
  </cac:InvoiceDocumentReference>
</cac:BillingReference>
```
الكود الحالي لا يضيف هذا العنصر. سيتم رفض أي إشعار دائن/مدين بخطأ `BR-ZATCA-KSA-DG-02`.

### 2. TaxExemptionReasonCode مفقود عند الإعفاء/نسبة صفر (حرج)
**المرجع**: BT-121 / BT-120

عندما يكون `vatCategoryCode` = `"E"` (معفى) أو `"Z"` (نسبة صفرية)، يجب إضافة:
```xml
<cbc:TaxExemptionReasonCode>VATEX-SA-...</cbc:TaxExemptionReasonCode>
<cbc:TaxExemptionReason>سبب الإعفاء</cbc:TaxExemptionReason>
```
غيابهما يسبب خطأ `BR-E-10` أو `BR-Z-10`.

### 3. عنوان المشتري ناقص في الفواتير القياسية (متوسط)
**المرجع**: BT-50..BT-55

الكود الحالي يفتقر لعناصر إلزامية في عنوان المشتري:
- `<cbc:BuildingNumber>` (BT-163 KSA)
- `<cbc:CitySubdivisionName>` (BT-164 KSA — الحي)
- `<cbc:CountrySubentity>` (BT-54 — المنطقة)
- `<cbc:PostalZone>` موجود ✅

### 4. LatestDeliveryDate مفقود للقياسية (منخفض)
**المرجع**: BT-73

النموذج الرسمي يتضمن `<cbc:LatestDeliveryDate>` بجانب `ActualDeliveryDate`. اختياري لكن يحسّن الامتثال.

### 5. PaymentMeansCode ثابت = 10 (منخفض)
**المرجع**: BT-81

القيمة `10` (نقداً) ثابتة. يجب أن تكون قابلة للتكوين:
- `10` = نقداً
- `30` = تحويل بنكي
- `42` = حساب بنكي
- `48` = بطاقة ائتمان

### 6. InvoiceLine ID ثابت = "1" (منخفض)
لا يدعم فواتير متعددة البنود حالياً. مقبول لتطبيق إيجار بسيط.

---

## خطة الإصلاح

| # | الملف | التغيير | الأولوية |
|---|---|---|---|
| 1 | `zatca-xml-generator/index.ts` | إضافة `<cac:BillingReference>` عند إصدار إشعار دائن/مدين (381/383) | حرج |
| 2 | `zatca-xml-generator/index.ts` | إضافة `TaxExemptionReasonCode` و `TaxExemptionReason` عند vatCategory = E أو Z | حرج |
| 3 | `zatca-xml-generator/index.ts` | إكمال عنوان المشتري: `BuildingNumber` + `CitySubdivisionName` + `CountrySubentity` | متوسط |
| 4 | `zatca-xml-generator/index.ts` | إضافة `LatestDeliveryDate` للفواتير القياسية | منخفض |
| 5 | `zatca-xml-generator/index.ts` | جعل `PaymentMeansCode` ديناميكياً من بيانات الفاتورة | منخفض |

### تفاصيل التعديلات الحرجة:

**البند 1** — بعد `<cbc:Note>` وقبل `<cac:AdditionalDocumentReference>`:
```xml
${typeInfo.code !== "388" ? `
<cac:BillingReference>
  <cac:InvoiceDocumentReference>
    <cbc:ID>${escapeXml(String(inv.original_invoice_number || ""))}</cbc:ID>
  </cac:InvoiceDocumentReference>
</cac:BillingReference>` : ""}
```

**البند 2** — داخل كل `<cac:TaxCategory>` عند E أو Z:
```xml
${vatCategoryCode !== "S" ? `
<cbc:TaxExemptionReasonCode>${exemptionReasonCode}</cbc:TaxExemptionReasonCode>
<cbc:TaxExemptionReason>${exemptionReason}</cbc:TaxExemptionReason>` : ""}
```
مع استخدام أكواد مثل: `VATEX-SA-29` (خدمات عقارية إيجارية سكنية معفاة).

**البند 3** — إكمال عنوان المشتري في الفاتورة القياسية:
```xml
<cbc:StreetName>...</cbc:StreetName>
<cbc:BuildingNumber>${inv.buyer_building || ""}</cbc:BuildingNumber>
<cbc:CitySubdivisionName>${inv.buyer_district || ""}</cbc:CitySubdivisionName>
<cbc:CityName>...</cbc:CityName>
<cbc:PostalZone>...</cbc:PostalZone>
<cbc:CountrySubentity>${inv.buyer_province || ""}</cbc:CountrySubentity>
```

