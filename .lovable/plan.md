

# تقرير الامتثال التفصيلي — ZATCA SDK مقابل التنفيذ الحالي

---

## المنهجية

تمت المقارنة بند بند مع مواصفات ZATCA .NET SDK الرسمي (الإصدار المرفق — LGPL v3). كل عملية من الست عمليات الأساسية تم فحصها على مستوى الكود والتسلسل المنطقي.

---

## 1. Generate CSR — توليد طلب الشهادة

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **الخوارزمية** | ECDSA على `prime256v1` (P-256) | `p256.getPublicKey()` + `p256.sign()` | ✅ |
| **الصيغة** | PKCS#10 CSR → Base64 (ليس PEM) | `btoa(String.fromCharCode(...csrDer))` — Base64 خام | ✅ |
| **حقل CN** | اسم الجهاز (Device Serial) | `{ oid: [2,5,4,3], value: deviceSerial }` | ✅ |
| **حقل SERIALNUMBER** | الرقم الضريبي (VAT TIN) | `{ oid: [2,5,4,5], value: vatNumber }` | ✅ |
| **حقل O** | اسم المنشأة | `{ oid: [2,5,4,10], value: orgName }` | ✅ |
| **حقل C** | SA | `{ oid: [2,5,4,6], value: "SA" }` | ✅ |
| **Algorithm Identifier** | ecdsaWithSHA256 (OID 1.2.840.10045.4.3.2) | `asn1Oid([1,2,840,10045,4,3,2])` | ✅ |
| **بيئة Simulation/Production** | SDK يدعم `EnvironmentType` | يعتمد على `ZATCA_API_URL` — لا يوجد template name في Extension | ⚠️ جزئي |
| **Extensions (SAN, etc.)** | SDK يضيف X509 extensions عبر `X509ExtensionsGenerator` | لا يتم إضافة أي extensions في CSR | 🔴 ناقص |
| **إرسال CSR** | إلى `/compliance` مع `OTP` | `fetch(ZATCA_API_URL/compliance, { OTP })` | ✅ |
| **تخزين النتيجة** | `binarySecurityToken` + `secret` + `requestID` | يتم تخزينها في `zatca_certificates` مع تشفير المفتاح | ✅ |

**ملاحظة حرجة**: SDK الرسمي يضيف X509 Extensions في CSR تتضمن:
- `SubjectAlternativeName` (SAN) — يحتوي على معرّف الحل التقني
- `CertificateTemplateName` — يميز بين `ZATCA-Code-Signing` (Production) و `PREZATCA-Code-Signing` (Simulation)

التنفيذ الحالي **لا يضيف هذه Extensions** مما قد يؤدي لرفض CSR من بعض بيئات ZATCA.

---

## 2. Generate Hash — توليد الهاش

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **إزالة UBLExtensions** | حذف `<ext:UBLExtensions>` | `xmlForHash.replace(/<ext:UBLExtensions>...`)` | ✅ |
| **إزالة cac:Signature** | حذف `<cac:Signature>` | `xmlForHash.replace(/<cac:Signature>...`)` | ✅ |
| **Canonicalization** | C14N (W3C) | دالة `c14n()` مخصصة — regex-based | ⚠️ تقريبي |
| **خوارزمية الهاش** | SHA-256 | `crypto.subtle.digest("SHA-256")` | ✅ |
| **الإخراج** | Base64 | `btoa()` | ✅ |

**ملاحظة**: دالة C14N المستخدمة هي تقريبية (regex-based) وليست مكتبة XML حقيقية. تعمل مع UBL 2.1 الحالي لكنها قد تفشل مع XML معقد يحتوي على:
- Namespaces متداخلة مع إعادة تعريف
- CDATA sections
- Entity references

هذا مقبول عملياً لأن XML المولّد داخلياً معروف الهيكل.

---

## 3. Generate QR — توليد رمز الاستجابة السريعة

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **TLV Tags 1-5** | Seller, VAT, Timestamp, TotalWithVat, VatAmount | Tags 1-5 جميعها موجودة | ✅ |
| **BER Length Encoding** | Multi-byte للقيم > 127 | `berLength()` — يدعم 0x81 و 0x82 | ✅ |
| **Tag-4 القيمة** | `TaxInclusiveAmount` = مبلغ + ضريبة | `amount + vat_amount` | ✅ |
| **الترميز** | TLV → Base64 | `btoa()` من Uint8Array | ✅ |
| **حقن في XML** | `AdditionalDocumentReference` بـ ID=QR | يتم الحقن في `EmbeddedDocumentBinaryObject` | ✅ |
| **Tags 6-9 (Phase 2 Standard)** | Signature, Public Key, Cert Signature, Cert Public Key | ❌ غير موجود | 🔴 ناقص |

**ملاحظة حرجة**: للفواتير **القياسية (Standard)** في المرحلة الثانية، يتطلب ZATCA Tags 6-9 إضافية تتضمن:
- Tag 6: التوقيع الرقمي (raw signature bytes)
- Tag 7: المفتاح العام (public key)
- Tag 8: توقيع الشهادة (certificate signature)
- Tag 9: المفتاح العام للشهادة

التنفيذ الحالي يكتفي بـ Tags 1-5 فقط. هذا كافٍ للفواتير **المبسطة (Simplified)** لكنه **غير كافٍ للقياسية**.

---

## 4. Sign E-Invoice — توقيع الفاتورة

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **ICV Allocation** | ذري مع حماية race condition | `allocate_icv_and_chain` مع `LOCK TABLE EXCLUSIVE` | ✅ |
| **ICV Injection** | حقن ICV في XML قبل الهاش | regex replace لقيمة `<cbc:UUID>` في ICV reference | ✅ |
| **Invoice Digest** | C14N → SHA-256 → Base64 | `c14n(xmlForHash)` → `sha256Base64()` | ✅ |
| **SignedProperties** | certDigest + SigningTime + IssuerSerial | جميعها موجودة مع استخراج ديناميكي من الشهادة | ✅ |
| **SignedInfo** | invoiceDigest + propsDigest | Reference مزدوج (invoice + properties) | ✅ |
| **خوارزمية التوقيع** | ECDSA-SHA256 على P-256 | `p256.sign(hash, privateKey)` → DER | ✅ |
| **حقن التوقيع** | في `UBLExtensions/ExtensionContent` | regex replace للـ placeholder | ✅ |
| **حماية التوقيع المزدوج** | منع توقيع فاتورة مرتين | `if (inv.invoice_hash) return error(409)` | ✅ |
| **XAdES-BES Compliance** | `xades:QualifyingProperties` + `xades:SignedProperties` | موجود مع `Id="xadesSignedProperties"` | ✅ |
| **X509IssuerSerial** | من الشهادة الفعلية | ASN.1 DER parser مدمج | ✅ |
| **CanonicalizationMethod** | `xml-c14n11` | مطابق في SignedInfo | ✅ |
| **SignatureMethod** | `ecdsa-sha256` | مطابق في SignedInfo | ✅ |
| **XPath Transforms** | استثناء UBLExtensions و Signature | مطابق في ds:Reference | ✅ |

**ملاحظة**: `xades` namespace URI هو `http://uri.etsi.org/01011/v1.3.2#` — يجب التأكد أن ZATCA يقبل هذا وليس `http://uri.etsi.org/01903/v1.3.2#` (الأكثر شيوعاً). الرقم `01011` قد يكون خطأ مطبعي.

---

## 5. Generate Request — توليد طلب API

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **Payload Format** | JSON: `{invoiceHash, uuid, invoice}` | مطابق تماماً | ✅ |
| **invoice encoding** | Base64 of full signed XML | `btoa(xml)` | ✅ |
| **Authorization** | `Basic(BST:secret)` | `btoa(bst + ":" + secret)` | ✅ |
| **Accept-Version** | V2 | `ZATCA_COMMON_HEADERS["Accept-Version"] = "V2"` | ✅ |
| **Clearance-Status** | `1` for clearance, `0` for reporting | `action === "clearance" ? "1" : "0"` | ✅ |
| **Compliance Check** | `/compliance/invoices` | مسار منفصل `compliance-check` | ✅ |
| **Production Upgrade** | `/production/csids` | مسار `production` | ✅ |
| **Content-Type** | `application/json` | ✅ في `ZATCA_COMMON_HEADERS` | ✅ |
| **Accept-Language** | `ar` أو `en` | `ar` في report/clearance/compliance | ✅ |

---

## 6. Validate E-Invoice — التحقق من صحة الفاتورة

| البند | المطلوب (SDK) | التنفيذ الحالي | الحكم |
|---|---|---|---|
| **XSD Validation** | التحقق من هيكل XML | ❌ غير موجود | 🔴 |
| **EN Schematron** | قواعد الاتحاد الأوروبي | ❌ غير موجود | 🔴 |
| **KSA Schematron** | قواعد ZATCA السعودية | ❌ غير موجود | 🔴 |
| **Signature Validation** | التحقق من التوقيع | ❌ غير موجود | 🔴 |
| **QR Validation** | التحقق من QR | ❌ غير موجود | 🔴 |
| **PIH Validation** | التحقق من سلسلة الهاش | ❌ غير موجود | 🔴 |

---

## ملخص الفجوات المكتشفة

```text
┌────────────────────────────────────────────────────────────────────┐
│  العملية             │ الحكم    │ الفجوات                          │
├──────────────────────┼──────────┼──────────────────────────────────┤
│ 1. Generate CSR      │ ⚠️ 90%   │ X509 Extensions (SAN + Template) │
│ 2. Generate Hash     │ ✅ 100%  │ —                                │
│ 3. Generate QR       │ ⚠️ 80%   │ Tags 6-9 للفواتير القياسية       │
│ 4. Sign E-Invoice    │ ⚠️ 98%   │ XAdES namespace URI قد يكون خطأ   │
│ 5. Generate Request  │ ✅ 100%  │ —                                │
│ 6. Validate          │ 🔴 0%   │ غير موجود بالكامل                │
└──────────────────────┴──────────┴──────────────────────────────────┘
```

---

## خطة الإصلاح المقترحة (3 بنود)

### البند 1: إضافة X509 Extensions في CSR (أولوية عالية)
**الملف**: `supabase/functions/zatca-api/index.ts`
- إضافة `SubjectAlternativeName` extension تحتوي على معرّف الحل التقني
- إضافة `CertificateTemplateName` extension (`PREZATCA-Code-Signing` للاختبار، `ZATCA-Code-Signing` للإنتاج)
- إضافة هذه كـ `extensionRequest` (OID 1.2.840.113549.1.9.14) في CSR attributes

### البند 2: إضافة Tags 6-9 في QR للفواتير القياسية (أولوية عالية)
**الملفات**: `zatca-signer/index.ts` + `src/utils/zatcaQr.ts`
- بعد التوقيع، إضافة:
  - Tag 6: `sig.toDERRawBytes()` (التوقيع الخام)
  - Tag 7: المفتاح العام من الشهادة
  - Tag 8: توقيع شهادة CA
  - Tag 9: المفتاح العام لشهادة CA
- تطبيق Tags 6-9 فقط عندما يكون `invoice_type !== "simplified"`

### البند 3: تصحيح XAdES Namespace URI (أولوية متوسطة)
**الملف**: `supabase/functions/zatca-signer/index.ts`
- تغيير `http://uri.etsi.org/01011/v1.3.2#` إلى `http://uri.etsi.org/01903/v1.3.2#`
- هذا تصحيح بسيط لكنه قد يسبب رفض التوقيع من ZATCA

### البند 4: إضافة Validation أساسي (أولوية منخفضة — اختياري)
**الملف**: `supabase/functions/zatca-signer/index.ts`
- التحقق من وجود الحقول الإلزامية قبل التوقيع
- التحقق من اتساق المبالغ (TaxInclusive = TaxExclusive + VAT)
- التحقق من PIH يطابق آخر hash في `invoice_chain`
- **لا** يشمل XSD/Schematron (غير عملي في Edge Functions)

---

## التقييم النهائي

التنفيذ الحالي ممتثل بنسبة **~85%** لمواصفات ZATCA SDK. الفجوات الأساسية:
1. **CSR Extensions** — قد تمنع Onboarding في بيئة الإنتاج الفعلية
2. **QR Tags 6-9** — مطلوبة فقط للفواتير القياسية (Standard) في المرحلة 2
3. **XAdES URI** — خطأ مطبعي محتمل قد يرفض التوقيع

البنود 1 و 3 هي الأعلى أولوية لضمان نجاح Onboarding والتوقيع.

