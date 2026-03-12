

# تحديث خطة ZATCA — إضافة الفجوات 7-12

## الهدف
تحديث `.lovable/plan.md` بإضافة الفجوات الست الإضافية التي كشفها التدقيق الشامل، مع تنظيم الخطة في أقسام واضحة.

## التغييرات المطلوبة

### 1. تحديث `.lovable/plan.md`
إعادة كتابة الملف ليشمل:
- القسم الحالي (ما تم تنفيذه)
- خارطة طريق ZATCA الكاملة بـ 12 فجوة مرتبة حسب الأولوية

### 2. هيكل الخطة المحدّثة

**المرحلة 1 — إصلاح XML Generator (GAP-3 + GAP-8)**
- إضافة العناصر الإلزامية الناقصة
- قراءة `invoice_type` من الفاتورة لتحديد `name` attribute (0100000 vs 0200000)
- دعم أنواع الفواتير: Standard, Simplified, Debit Note, Credit Note

**المرحلة 2 — إصلاح Signer (GAP-1 + GAP-11 + GAP-12)**
- C14N + ECDSA-secp256k1 بدل SHA-256 البسيط
- حل race condition على ICV باستخدام `SELECT FOR UPDATE` أو دالة RPC ذرية
- منع التوقيع المزدوج: التحقق من `invoice_hash` قبل التوقيع

**المرحلة 3 — إصلاح Onboarding و API Auth (GAP-2 + GAP-4)**
- توليد CSR حقيقي (PKCS#10) بدل إرسال المفتاح الخاص
- تصحيح Auth header إلى `binarySecurityToken:secret`

**المرحلة 4 — إصلاح مسار payment_invoices (GAP-9)**
- إضافة أعمدة `zatca_xml`, `invoice_hash`, `icv` لجدول `payment_invoices` عبر migration
- توحيد مسار XML → Sign → Submit ليعمل على كلا الجدولين

**المرحلة 5 — QR + TLV (GAP-5 + GAP-10)**
- إصلاح TLV encoding لدعم قيم أكبر من 127 بايت (multi-byte length)
- ربط QR داخل XML كـ `AdditionalDocumentReference`
- تضمين QR في PDF

**المرحلة 6 — إصلاح UI (GAP-7)**
- تعطيل زر "توقيع" حتى يوجد `zatca_xml`
- تعطيل زر "إرسال" حتى يوجد `invoice_hash`
- عرض حالة كل خطوة بصرياً (stepper أو badges)

### 3. الملفات المتأثرة

| الملف | الفجوات |
|-------|---------|
| `supabase/functions/zatca-xml-generator/index.ts` | GAP-3, GAP-8 |
| `supabase/functions/zatca-signer/index.ts` | GAP-1, GAP-11, GAP-12 |
| `supabase/functions/zatca-api/index.ts` | GAP-2, GAP-4, GAP-9 |
| `src/utils/zatcaQr.ts` | GAP-10 |
| `src/pages/dashboard/ZatcaManagementPage.tsx` | GAP-7, GAP-9 |
| Migration SQL | GAP-9 (أعمدة جديدة لـ payment_invoices) |

### 4. Migration مطلوب (GAP-9)
```sql
ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS zatca_xml text,
  ADD COLUMN IF NOT EXISTS invoice_hash text,
  ADD COLUMN IF NOT EXISTS icv integer,
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'simplified';
```

