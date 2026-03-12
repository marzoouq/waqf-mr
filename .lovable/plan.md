

# خطة إصلاح الامتثال — Onboarding + ZATCA Signer

## المشاكل المكتشفة بعد فحص الكود الحالي

### 1. CSR Extensions — SAN UUID ثابت (أولوية عالية)
**الملف**: `zatca-api/index.ts` سطر 112
```typescript
const sanValue = `1-${solutionName}|2-1|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f`;
```
UUID ثابت مكتوب يدوياً — يجب استخدام `zatca_device_serial` من الإعدادات الذي يحتوي على القيمة بصيغة `1-XXX|2-YYY|3-ZZZ`.

**الإصلاح**: استخدام `deviceSerial` المُحمّل من `app_settings` بدل القيمة الثابتة.

### 2. QR Tags 8-9 — بيانات خاطئة (أولوية عالية)
**الملف**: `zatca-signer/index.ts` سطر 603-607
```typescript
certSigBytes = certDer; // ← خطأ: يمرر الشهادة كاملة بدل التوقيع فقط
certPubKeyBytes = pubKeyBytes; // ← خطأ: يستخدم مفتاحنا بدل مفتاح CA
```
- **Tag 8** يجب أن يحتوي على توقيع الشهادة (signature field من DER) وليس الشهادة كاملة
- **Tag 9** يجب أن يحتوي على المفتاح العام لشهادة CA، وليس مفتاحنا

**الإصلاح**: إضافة دالة `extractCertSignatureAndPublicKey(certDer)` تستخرج:
- `tbsCertificate.subjectPublicKeyInfo.subjectPublicKey` → Tag 9
- `signatureValue` (آخر BitString في الشهادة) → Tag 8

### 3. Rollback عند فشل التوقيع (أولوية متوسطة)
**الملف**: `zatca-signer/index.ts` سطر 498-507
إذا فشل التوقيع بعد `allocate_icv_and_chain`، يبقى سجل بـ hash=`"PENDING"` يكسر سلسلة PIH.

**الإصلاح**: لف خطوات التوقيع في `try/catch` مع حذف سجل `invoice_chain` عند الفشل.

### 4. فئة ضريبة الصفر — `E` بدل `Z` (أولوية منخفضة)
**الملف**: `zatca-xml-generator/index.ts` سطر 40-42
يُرجع `"E"` (معفي) دائماً للضريبة الصفرية، بينما الأوقاف قد تحتاج `"Z"` (صفري).

**الإصلاح**: إضافة `vat_exemption_reason` كحقل اختياري. إذا لم يُحدد، استخدام `"Z"` بدل `"E"`.

---

## خطة التنفيذ

| # | الملف | التغيير |
|---|---|---|
| 1 | `zatca-api/index.ts` | استبدال UUID الثابت في SAN بـ `deviceSerial` |
| 2 | `zatca-signer/index.ts` | إضافة `extractCertSignatureAndPublicKey()` لاستخراج Tags 8-9 الصحيحة |
| 3 | `zatca-signer/index.ts` | إضافة try/catch + rollback لـ invoice_chain عند فشل التوقيع |
| 4 | `zatca-xml-generator/index.ts` | تغيير القيمة الافتراضية من `"E"` إلى `"Z"` للضريبة الصفرية |
| 5 | `public/changelog.json` | إضافة إصدار 2.8.1 بجميع التحسينات |

