

# فحص امتثال التطبيق لمتطلبات واجهات ZATCA الستة

## ملخص النتائج

| # | واجهة برمجة التطبيقات | الحالة | ملاحظات |
|---|---|---|---|
| **1** | Reporting API (إرسال الفواتير) | ✅ مُطبّق | `action: "report"` → `POST /invoices/reporting/single` |
| **2** | Clearance API (اعتماد الفواتير) | ✅ مُطبّق | `action: "clearance"` → `POST /invoices/clearance/single` مع `ClearanceStatus: "1"` |
| **3** | Compliance CSID API (شهادة الامتثال) | ✅ مُطبّق | `action: "onboard"` → `POST /compliance` مع CSR + OTP |
| **4** | Production CSID API (شهادة الإنتاج — التهيئة) | ✅ مُطبّق | `action: "production"` → `POST /production/csids` مع `compliance_request_id` |
| **5** | Production CSID API (التجديد) | ⚠️ **غير مُطبّق** | لا يوجد `action: "renew"` — يحتاج OTP جديد + CSR جديد |
| **6** | Compliance Checks APIs (فحص الامتثال) | ✅ مُطبّق جزئياً | `action: "compliance-check"` → `POST /compliance/invoices` — لكن بدون Buyer QRs و Seller QRs |

---

## التفاصيل التقنية لكل بند

### ✅ API #1 — Reporting API
- **الكود:** `zatca-api/index.ts` سطر 706-801
- **المسار:** `POST {ZATCA_URL}/invoices/reporting/single`
- **المُدخلات:** `invoiceHash`, `uuid`, `invoice` (base64 XML) ✅
- **المصادقة:** `Basic` بـ BST + Secret من الشهادة النشطة ✅
- **الهيدرات:** `Accept-Version: V2`, `Accept-Language: ar` ✅
- **المُخرجات:** يُحدّث `zatca_status` إلى `reported` أو `rejected` ✅
- **دعم الفواتير المبسطة:** نعم — `invoice_type: "simplified"` → `InvoiceTypeCode=388, name=0200000` ✅

### ✅ API #2 — Clearance API
- **الكود:** نفس الـ handler (سطر 706) مع `action === "clearance"`
- **المسار:** `POST {ZATCA_URL}/invoices/clearance/single`
- **الهيدر الإضافي:** `ClearanceStatus: "1"` ✅
- **المُخرجات:** يُحدّث إلى `cleared` أو `rejected` ✅
- ⚠️ **لا يتم التعامل مع الردّ 303** (آلية الاعتماد غير مفعّلة → توجيه لـ Reporting API)

### ✅ API #3 — Compliance CSID
- **الكود:** `action: "onboard"` (سطر 332-522)
- **توليد CSR:** مبني بالكامل (ECDSA P-256, ASN.1 DER) ✅
- **Subject DN:** `C=SA, O={orgName}, CN={deviceSerial}, SERIALNUMBER={vatNumber}` ✅
- **Extensions:** `SubjectAlternativeName` (UID=deviceSerial) + `CertificateTemplateName` (ZATCA-Code-Signing / PREZATCA-Code-Signing) ✅
- **OTP:** يُرسل في هيدر `OTP` ✅
- **المُخرجات:** يُخزّن `binarySecurityToken`, `secret`, `requestID` في `zatca_certificates` ✅
- **مسح OTP بعد النجاح:** ✅

### ✅ API #4 — Production CSID (التهيئة)
- **الكود:** `action: "production"` (سطر 622-702)
- **المسار:** `POST {ZATCA_URL}/production/csids`
- **المُدخلات:** `compliance_request_id` من الشهادة النشطة ✅
- **المصادقة:** `Basic` بشهادة الامتثال ✅
- **المُخرجات:** يُخزّن شهادة الإنتاج كشهادة نشطة جديدة ✅

### ⚠️ API #5 — Production CSID (التجديد) — **غير مُطبّق**
- **المفقود:** لا يوجد `action: "renew"` في الكود
- **المطلوب:** نفس مسار الإنتاج لكن مع:
  - توليد CSR جديد
  - OTP جديد (zatca_otp_2)
  - إرسال لـ `/compliance` للحصول على Compliance CSID جديد
  - ثم إرسال لـ `/production/csids` للحصول على Production CSID محدّث

### ⚠️ API #6 — Compliance Checks — **مُطبّق جزئياً**
- **المُطبّق:** فحص امتثال الفواتير عبر `POST /compliance/invoices` ✅
- **غير المُطبّق:**
  - ❌ **Compliance Buyer QRs API** — `POST /compliance/buyer-qrs` (للاعتماد الثنائي المسار)
  - ❌ **Compliance Seller QRs API** — `POST /compliance/seller-qrs` (للفوترة الذاتية)
  - ❌ **Compliance Invoice Clearance Disabled API** — التعامل مع حالة عدم تفعيل آلية الاعتماد

---

## ملاحظات إضافية على جودة التطبيق

### ✅ نقاط القوة
| البند | الحالة |
|---|---|
| توقيع ECDSA P-256 (XMLDSig كامل) | ✅ |
| QR TLV مع Tags 1-5 (مبسطة) و 6-9 (قياسية) | ✅ |
| سلسلة PIH (Invoice Chain) مع ICV ذري | ✅ |
| حماية التوقيع المزدوج (GAP-12) | ✅ |
| Rollback عند فشل التوقيع | ✅ |
| Rate Limiting (20-30/دقيقة) | ✅ |
| تحقق من الرقم الضريبي (15 رقم, يبدأ وينتهي بـ 3) | ✅ |
| دعم إشعارات دائنة/مدينة (381/383) | ✅ |
| BillingReference للإشعارات | ✅ |
| AllowanceCharge (خصومات/رسوم) | ✅ |
| إعفاء ضريبي (VATEX-SA-29-7, VATEX-SA-32) | ✅ |
| X.509 Issuer/Serial من الشهادة الفعلية | ✅ |

### ⚠️ نقاط تحتاج تحسين
| البند | التفاصيل |
|---|---|
| عدم التعامل مع الردّ 303 من Clearance API | عند عدم تفعيل آلية الاعتماد، يجب توجيه المستخدم لاستخدام Reporting API |
| عدم وجود واجهة تجديد الشهادة | `action: "renew"` مفقود تماماً |
| Buyer/Seller QR Compliance APIs مفقودة | مطلوبة للاعتماد الثنائي المسار والفوترة الذاتية |

---

## الخطة المقترحة — 3 إضافات مطلوبة

### 1. إضافة `action: "renew"` لتجديد شهادة الإنتاج
**الملف:** `supabase/functions/zatca-api/index.ts`
- إعادة استخدام منطق `onboard` لتوليد CSR جديد مع `zatca_otp_2`
- ثم استدعاء `/production/csids` للحصول على شهادة إنتاج محدّثة
- تخزين الشهادة الجديدة كشهادة نشطة

### 2. التعامل مع الردّ 303 في Clearance API
**الملف:** `supabase/functions/zatca-api/index.ts` (قسم clearance)
- إذا أرجع الخادم `303`، إرجاع رسالة واضحة للمستخدم: "آلية الاعتماد غير مفعّلة — استخدم الإرسال (Reporting) بدلاً من الاعتماد"
- تحديث الواجهة لعرض هذا التوجيه

### 3. إضافة Compliance Buyer/Seller QRs APIs (أولوية منخفضة)
**الملف:** `supabase/functions/zatca-api/index.ts`
- `action: "compliance-buyer-qr"` → `POST /compliance/buyer-qrs`
- `action: "compliance-seller-qr"` → `POST /compliance/seller-qrs`
- مطلوبة فقط عند تفعيل الاعتماد الثنائي أو الفوترة الذاتية

---

## الملخص

| الأولوية | الإجراء | الجهد |
|---|---|---|
| 🔴 عالية | إضافة `action: "renew"` لتجديد الشهادة | 1 ساعة |
| 🟡 متوسطة | التعامل مع الردّ 303 في Clearance | 30 دقيقة |
| 🟢 منخفضة | Buyer/Seller QR Compliance APIs | 1 ساعة |

