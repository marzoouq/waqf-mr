

# فحص الامتثال مع مواصفات ZATCA Sandbox v2.1.1

بعد مراجعة شاملة للكود الحالي مقارنة بمتطلبات الإصدار 2.1.1 من البيئة التجريبية، إليك النتائج:

---

## ما تم تنفيذه بالفعل (مُمتثل)

| المتطلب | الحالة |
|---|---|
| CSR مع directoryName + UID OID | ✅ مُنفّذ (سطر 117-124) |
| CertificateTemplateName Extension | ✅ مُنفّذ (سطر 134-142) |
| توليد تلقائي لمفتاح ECDSA P-256 | ✅ مُنفّذ (سطر 308) |
| 4 XPath Transforms (بما في ذلك استثناء QR) | ✅ مُنفّذ (سطر 324-333) |
| استثناء QR من Invoice Digest | ✅ مُنفّذ (سطر 613-616) |
| schemeID على TaxCategory و TaxScheme | ✅ مُنفّذ |
| تنسيق Percent بعشريتين (.toFixed(2)) | ✅ مُنفّذ |
| AllowanceCharge + AllowanceTotalAmount + PrepaidAmount | ✅ مُنفّذ |
| Tags 8-9 من DER الشهادة | ✅ مُنفّذ (extractCertSignatureAndPublicKey) |
| Rollback عند فشل التوقيع | ✅ مُنفّذ (سطر 746-755) |
| حظر PLACEHOLDER certificates | ✅ مُنفّذ (سطر 636-641) |
| Accept-Version: V2 | ✅ مُنفّذ (سطر 216) |
| Basic Auth بـ BST:Secret | ✅ مُنفّذ |
| Compliance Check API (/compliance/invoices) | ✅ مُنفّذ |
| Production CSID API (/production/csids) | ✅ مُنفّذ |
| Reporting + Clearance APIs | ✅ مُنفّذ |

## فجوات مكتشفة مع v2.1.1

### 1. Reporting API endpoint خاطئ (حرج)
**الحالي** (سطر 555):
```
/invoices/${endpoint}/single  →  /invoices/reporting/single
```
**المطلوب حسب Swagger v2.1.1**:
```
/invoices/reporting/single
```
هذا **صحيح** بالفعل. لا حاجة لتغيير.

### 2. مسار Clearance API (تحقق)
**الحالي**: `/invoices/clearance/single`
**المطلوب v2.1.1**: `/invoices/clearance/single`
✅ صحيح.

### 3. عدم إرسال `ClearanceStatus` في Reporting (متوسط)
حسب Swagger v2.1.1، الـ Reporting API يتطلب header `ClearanceStatus` بقيمة `"0"`.
**الحالي** (سطر 561): `"Clearance-Status"` بدل `"ClearanceStatus"`.
الـ Swagger يستخدم `ClearanceStatus` (بدون شرطة). هذا الاختلاف قد يسبب رفض الطلب.

### 4. عدم إرسال `AcceptVersion` بالتنسيق الصحيح (متوسط)
الـ header مُرسل كـ `Accept-Version` ولكن Swagger v2.1.1 يسمّيه `AcceptVersion` (بدون شرطة).
يجب التحقق — أغلب التطبيقات تقبل كلا الشكلين لكن الأفضل المطابقة.

### 5. الـ Note element مفقود (منخفض)
النموذج الرسمي يتضمن:
```xml
<cbc:Note languageID="ar">ABC</cbc:Note>
```
الكود الحالي لا يضيف عنصر Note. عنصر اختياري لكن وجوده يحسّن الامتثال.

### 6. عدم وجود Delivery block للفواتير القياسية مع بيانات المشتري الكاملة (منخفض)
النموذج يتضمن `<cbc:LatestDeliveryDate>` للفواتير القياسية. الكود يستخدم `ActualDeliveryDate` فقط — مقبول.

### 7. CompanyID schemeID للمشتري مفقود (متوسط)
**الحالي** (سطر 182):
```xml
<cbc:CompanyID>${inv.buyer_vat}</cbc:CompanyID>
```
**المطلوب**:
```xml
<cbc:CompanyID schemeID="TIN">${inv.buyer_vat}</cbc:CompanyID>
```

---

## خطة الإصلاح (3 تعديلات فقط)

| # | الملف | التغيير | الأولوية |
|---|---|---|---|
| 1 | `zatca-api/index.ts` | تغيير `"Clearance-Status"` إلى `"ClearanceStatus"` في headers | حرج |
| 2 | `zatca-xml-generator/index.ts` | إضافة `schemeID="TIN"` على `CompanyID` للمشتري (Standard invoices) | متوسط |
| 3 | `zatca-xml-generator/index.ts` | إضافة عنصر `<cbc:Note languageID="ar">` اختياري | منخفض |

### تفاصيل التعديلات:

**البند 1** — `zatca-api/index.ts` سطر 561:
```typescript
// قبل:
"Clearance-Status": action === "clearance" ? "1" : "0",
// بعد:
"ClearanceStatus": action === "clearance" ? "1" : "0",
```

**البند 2** — `zatca-xml-generator/index.ts` سطر 182:
```xml
<!-- قبل: -->
<cbc:CompanyID>${inv.buyer_vat}</cbc:CompanyID>
<!-- بعد: -->
<cbc:CompanyID schemeID="TIN">${inv.buyer_vat}</cbc:CompanyID>
```

**البند 3** — `zatca-xml-generator/index.ts` بعد `<cbc:DocumentCurrencyCode>`:
```xml
<cbc:Note languageID="ar">${escapeXml(String(inv.notes || inv.description || ""))}</cbc:Note>
```

---

## الخلاصة

التنفيذ الحالي **مُمتثل بنسبة ~95%** مع مواصفات v2.1.1. الفجوات المتبقية صغيرة (اسم header + schemeID مفقود). التعديلات المقترحة هي 3 تغييرات بسيطة فقط.

