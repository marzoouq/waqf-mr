

# تقرير فحص عملية Onboarding مع ZATCA

## الحالة الراهنة

بعد فحص شامل للكود والبيئة، تم اكتشاف **3 مشاكل تمنع نجاح عملية Onboarding**:

---

## المشكلة 1: أسرار ZATCA غير مُعدّة (حرج)

الأسرار الموجودة حالياً: `LOVABLE_API_KEY` + `PII_ENCRYPTION_KEY` فقط.

**المطلوب ولم يُعدّ:**
- `ZATCA_API_URL` — بدونه يُنشئ النظام شهادة وهمية (PLACEHOLDER) بدل الاتصال بالهيئة
- `ZATCA_OTP` — كود OTP من بوابة الهيئة
- `ZATCA_PRIVATE_KEY` — المفتاح الخاص ECDSA (hex 32 bytes)

**الأثر**: عند استدعاء `action: 'onboard'` حالياً، الكود يدخل مسار `if (!ZATCA_API_URL)` ويُنشئ شهادة `PLACEHOLDER_CERTIFICATE_DEV` — لن يتصل بالهيئة أبداً.

## المشكلة 2: OID خاطئ في SAN Extension (متوسط)

```text
الملف: zatca-api/index.ts سطر 115
الكود الحالي: asn1Oid([2, 16, 840, 1, 113733, 1, 6, 9])  // VeriSign registeredID
المطلوب (ZATCA): asn1Oid([2, 5, 29, 17, 1])  أو OtherName مع OID خاص بالهيئة
```

ZATCA SDK يستخدم `GeneralNames` مع `otherName` بتنسيق محدد. OID `2.16.840.1.113733.1.6.9` خاص بـ VeriSign وقد يُرفض من خادم ZATCA. يجب استخدام `directoryName` بدلاً من `otherName` مع `registeredID`.

## المشكلة 3: هيكل SAN غير مطابق لمواصفات ZATCA (متوسط)

مواصفات ZATCA تتوقع SAN يحتوي على `directoryName` بحقول:
- `UID` (OID 0.9.2342.19200300.100.1.1) = الرقم التسلسلي بصيغة `1-XXX|2-YYY|3-ZZZ`

الكود الحالي يستخدم `otherName` مع OID VeriSign وهو تنسيق مختلف.

---

## خطة الإصلاح

### البند 1: إضافة الأسرار المطلوبة
- طلب إدخال `ZATCA_API_URL` (بيئة الاختبار: `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal` أو بيئة Simulation)
- طلب إدخال `ZATCA_OTP` 
- طلب إدخال `ZATCA_PRIVATE_KEY` (أو توليده تلقائياً)

### البند 2: تصحيح SAN Extension في CSR
**الملف**: `supabase/functions/zatca-api/index.ts`

تغيير `buildCsrExtensions` لاستخدام `directoryName` بدل `otherName` مع `registeredID`:
```typescript
// بدل:
const sanOtherName = asn1Context(0, asn1Sequence([
  asn1Oid([2, 16, 840, 1, 113733, 1, 6, 9]),
  asn1Context(0, asn1Utf8String(sanValue)),
]));

// الصحيح — directoryName مع UID:
const uidAttr = asn1Set([asn1Sequence([
  asn1Oid([0, 9, 2342, 19200300, 100, 1, 1]), // UID
  asn1Utf8String(sanValue),
])]);
const dirName = asn1Context(4, asn1Sequence([uidAttr])); // directoryName [4]
```

### البند 3: إضافة توليد تلقائي للمفتاح الخاص
بدل الاعتماد على `ZATCA_PRIVATE_KEY` من env، يمكن توليد المفتاح تلقائياً عند Onboarding وتخزينه مباشرة في DB:
```typescript
const privKey = p256.utils.randomPrivateKey(); // 32 bytes
// استخدام privKey للتوقيع وتخزينه مشفراً في zatca_certificates
```

هذا يُبسّط العملية ويمنع مشكلة تعدد المفاتيح.

---

## ملخص الأولويات

```text
┌─────────────────────────────────────────────────┐
│ #  │ المشكلة                │ الأولوية │ الأثر  │
├────┼────────────────────────┼──────────┼────────┤
│ 1  │ أسرار ZATCA غير مُعدّة  │ 🔴 حرج   │ لا اتصال │
│ 2  │ SAN OID خاطئ           │ 🟠 متوسط │ رفض CSR │
│ 3  │ هيكل SAN غير مطابق    │ 🟠 متوسط │ رفض CSR │
└─────────────────────────────────────────────────┘
```

### التنفيذ المقترح
1. تصحيح `buildCsrExtensions` — SAN بصيغة `directoryName` + UID OID
2. إضافة توليد تلقائي للمفتاح الخاص عند Onboarding (إزالة الاعتماد على `ZATCA_PRIVATE_KEY`)
3. طلب إدخال `ZATCA_API_URL` و `ZATCA_OTP` كأسرار

