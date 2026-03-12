
# تقرير فحص التطبيق — waqf-mr.lovable.app

## ✅ تم التنفيذ

### 1. إصلاح تحذيرات forwardRef
- لف `AuthProvider` و `FiscalYearProvider` بـ `React.forwardRef`

### 2. إشعار حد السجلات في useCrudFactory
- إضافة toast تحذيري عند وصول البيانات للحد الأقصى (500 سجل)

### 3. تقسيم Auth.tsx إلى مكونات فرعية
- `LoginForm` — نموذج تسجيل الدخول (بريد + هوية وطنية)
- `SignupForm` — نموذج إنشاء حساب
- `BiometricLoginButton` — زر تسجيل الدخول بالبصمة
- `ResetPasswordForm` — نموذج استعادة كلمة المرور
- `normalizeDigits` — دالة مشتركة لتحويل الأرقام العربية

---

# 🏛️ خارطة طريق ZATCA — الامتثال الكامل لهيئة الزكاة والضريبة

## الفجوات المكتشفة (12 فجوة)

| # | الشدة | الفجوة | الحالة |
|---|-------|--------|--------|
| GAP-1 | 🔴 | التوقيع الرقمي ECDSA غائب — SHA-256 بسيط بدل C14N + ECDSA | ⏳ |
| GAP-2 | 🔴 | Onboarding يرسل private_key بدل CSR (PKCS#10) | ⏳ |
| GAP-3 | 🔴 | XML ناقص عناصر إلزامية (UBLExtensions, IssueTime, CustomerParty) | ⏳ |
| GAP-4 | 🔴 | Auth header خاطئ — يستخدم cert:private_key بدل binarySecurityToken | ⏳ |
| GAP-5 | 🟠 | QR موجود في `zatcaQr.ts` لكن غير مربوط بالـ XML | ⏳ |
| GAP-6 | ✅ | تشفير المفتاح الخاص — محلول عبر `get_active_zatca_certificate()` | ✅ |
| GAP-7 | 🔴 | UI بلا validation على ترتيب الخطوات (XML → Sign → Submit) | ⏳ |
| GAP-8 | 🔴 | `invoice_type` لا يُمرر للـ XML Generator | ⏳ |
| GAP-9 | 🔴 | `payment_invoices` ليس لديها أعمدة ZATCA — مسار الإرسال مكسور | ⏳ |
| GAP-10 | 🟠 | TLV encoding خاطئ للقيم > 127 بايت | ⏳ |
| GAP-11 | 🟠 | ICV race condition — `get_next_icv` بلا transaction | ⏳ |
| GAP-12 | 🟡 | Signer بلا حماية من التطبيق المزدوج | ⏳ |

---

## المراحل

### المرحلة 1 — إصلاح XML Generator (GAP-3 + GAP-8)
**الملف**: `supabase/functions/zatca-xml-generator/index.ts`

- إضافة `<cbc:IssueTime>` (وقت الإصدار)
- إضافة `<ext:UBLExtensions>` (مكان التوقيع + QR)
- إضافة `<cac:AccountingCustomerParty>` (بيانات المشتري)
- إضافة `<cac:AdditionalDocumentReference>` لـ PIH و QR
- إصلاح `schemeID="CRN"` → `schemeID="TIN"` للرقم الضريبي
- قراءة `invoice_type` لتحديد `name` attribute:
  - Standard: `<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>`
  - Simplified: `<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>`
  - Debit Note: `383`, Credit Note: `381`
- إضافة عنوان البائع من `app_settings` (street, city, postal_code)
- إضافة `zatca:ext` namespace

### المرحلة 2 — إصلاح Signer (GAP-1 + GAP-11 + GAP-12)
**الملف**: `supabase/functions/zatca-signer/index.ts`

- SHA-256 على كامل XML بعد Canonicalization (C14N)
- توقيع ECDSA-secp256k1 باستخدام المفتاح الخاص من `get_active_zatca_certificate()`
- تضمين التوقيع في `<ext:UBLExtensions>` داخل XML
- إضافة `<ds:SignedInfo>`, `<ds:SignatureValue>`, `<ds:X509Certificate>`
- حل race condition: استخدام `SELECT FOR UPDATE` أو RPC ذرية لـ ICV
- منع التوقيع المزدوج: `if (inv.invoice_hash) return error("already signed")`
- تحديث XML المخزّن في الفاتورة بعد التوقيع
- مكتبة مطلوبة: `@noble/secp256k1` عبر esm.sh

### المرحلة 3 — إصلاح Onboarding و API Auth (GAP-2 + GAP-4)
**الملف**: `supabase/functions/zatca-api/index.ts`

- **CSR Generation**: بناء PKCS#10 CSR حقيقي يحتوي على:
  - `CN` = اسم المنشأة
  - `O` = الرقم الضريبي
  - `serialNumber` = رقم الجهاز
- إرسال CSR (وليس المفتاح الخاص) + OTP إلى ZATCA
- تخزين `binarySecurityToken` كشهادة + المفتاح الخاص مشفراً
- إصلاح Auth header: `binarySecurityToken:secret` بدل `cert:private_key`

### المرحلة 4 — إصلاح مسار payment_invoices (GAP-9)
**Migration مطلوب**:
```sql
ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS zatca_xml text,
  ADD COLUMN IF NOT EXISTS invoice_hash text,
  ADD COLUMN IF NOT EXISTS icv integer,
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'simplified';
```

**الملفات المتأثرة**:
- `supabase/functions/zatca-api/index.ts` — إصلاح شرط XML الفارغ لـ payment_invoices
- `supabase/functions/zatca-signer/index.ts` — تحديث payment_invoices بعد التوقيع
- `src/pages/dashboard/ZatcaManagementPage.tsx` — جلب الأعمدة الجديدة

### المرحلة 5 — QR + TLV (GAP-5 + GAP-10)
**الملف**: `src/utils/zatcaQr.ts`

- إصلاح TLV encoding: دعم multi-byte length للقيم > 127 بايت
- ربط QR داخل XML كـ `<cac:AdditionalDocumentReference>` بـ `ID=QR`
- تضمين QR في PDF عبر `generateQrDataUrl()`

### المرحلة 6 — إصلاح UI (GAP-7)
**الملف**: `src/pages/dashboard/ZatcaManagementPage.tsx`

- تعطيل زر "توقيع" حتى يوجد `zatca_xml`
- تعطيل زر "إرسال" حتى يوجد `invoice_hash`
- عرض حالة كل خطوة بصرياً (stepper أو badges)

---

## ترتيب التنفيذ

```
المرحلة 1: XML ──→ المرحلة 2: التوقيع ──→ المرحلة 3: Onboarding + Auth
                              ↓
                        المرحلة 4: payment_invoices migration
                              ↓
                        المرحلة 5: QR في XML
                              ↓
                        المرحلة 6: UI validation
```

## ما لن يتغير
- جدول `invoice_chain` وآلية ICV — سليمة
- تشفير المفتاح الخاص — موجود ويعمل (GAP-6 ✅)
- حماية الفواتير من التعديل بعد الإرسال — trigger موجود وسليم
- إعدادات `ZatcaSettingsTab` — كاملة وسليمة
