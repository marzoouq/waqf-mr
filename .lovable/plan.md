

# خطة الإصلاح الشاملة — مراجعة بند بند مع الأدلة

---

## نتائج التحقق الجنائي من الكود الفعلي

### CRITICAL-1: مفتاح الرمز البريدي — مؤكد 🔴

**الدليل:**
- `ZatcaSettingsTab.tsx` سطر 18: يحفظ `business_address_postal_code`
- `zatca-xml-generator/index.ts` سطر 69: يقرأ `settings.business_address_postal` (بدون `_code`)
- `zatca-xml-generator/index.ts` سطر 285: يطلب `business_address_postal` من DB (بدون `_code`)

**النتيجة:** `postalZone` دائماً فارغ في XML. ZATCA يرفض الفاتورة.

**الإصلاح:** تغيير `business_address_postal` → `business_address_postal_code` في سطري 69 و 285.

---

### CRITICAL-2: ICV يُحقن بعد الهاش — مؤكد 🔴

**الدليل في `zatca-signer/index.ts`:**
- سطر 318-322 (Step 1): حساب `invoiceDigest` من XML الذي يحتوي ICV القديم (`inv.icv`)
- سطر 388-399 (Step 5): تخصيص ICV الجديد عبر `allocate_icv_and_chain`
- سطر 404-414 (Step 6): حفظ ICV الجديد لكن XML يحتوي على ICV القديم

**النتيجة:** الهاش محسوب على ICV خاطئ. عدم تطابق مع ZATCA.

**الإصلاح:** نقل `allocate_icv_and_chain` قبل Step 1، حقن ICV الجديد في XML، ثم حساب الهاش.

---

### CRITICAL-3: X509IssuerSerial ثابت — مؤكد 🔴

**الدليل:**
- سطر 174: `<ds:X509IssuerName>CN=ZATCA-SubCA</ds:X509IssuerName>` — ثابت
- سطر 175: `<ds:X509SerialNumber>0</ds:X509SerialNumber>` — ثابت

**الإصلاح:** استخراج IssuerName و SerialNumber من شهادة X.509 الحقيقية (تحليل ASN.1 DER من البيانات المشفرة base64).

---

### CRITICAL-4: QR Tag-4 يستخدم المبلغ الخاطئ — مؤكد 🔴

**الدليل:**
- سطر 375: `Number(inv.amount) || 0` — المبلغ بدون ضريبة
- ZATCA Tag-4 يتطلب `TaxInclusiveAmount` = `amount + vat_amount`

**الإصلاح:** تغيير إلى `(Number(inv.amount) || 0) + (Number(inv.vat_amount) || 0)`.

---

### BUG-10/11: توجيه الواقف خاطئ — مؤكد 🔴

**الدليل:**
- `Index.tsx` سطر 37: `navigate('/beneficiary')` عندما `role === 'waqif'`
- `Auth.tsx` سطر 62: `navigate('/beneficiary')` عندما `role === 'waqif'`
- `Unauthorized.tsx` سطر 12: `'/beneficiary'` عندما `role === 'waqif'`

**الإصلاح:** تغيير الثلاثة إلى `/waqif`.

---

### BUG-9: تناقض كلمة المرور (8 vs 6) — مؤكد 🟠

**الدليل:**
- `guard-signup/index.ts` سطر 60-64: `password.length < 8`
- `guardSignupSecurity.test.ts` سطر 17: `length < 6`
- `docs/API.md` سطر 208: `(6-128)`

**الإصلاح:** تصحيح الاختبار والوثيقة ليطابقا الكود (8-128).

---

### حذف calendar.tsx و react-day-picker — مؤكد سابقاً ✅

لا يوجد أي import لـ `calendar.tsx` في المشروع.

---

## خطة التنفيذ — 7 تغييرات

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `supabase/functions/zatca-xml-generator/index.ts` | سطر 69: `business_address_postal` → `business_address_postal_code`. سطر 285: نفس التصحيح |
| 2 | `supabase/functions/zatca-signer/index.ts` | إعادة ترتيب: تخصيص ICV (Step 5 الحالي) → حقنه في XML → ثم Step 1 (الهاش) |
| 3 | `supabase/functions/zatca-signer/index.ts` | استخراج IssuerName و SerialNumber من الشهادة بدل القيم الثابتة |
| 4 | `supabase/functions/zatca-signer/index.ts` | سطر 375: `Number(inv.amount)` → `Number(inv.amount) + Number(inv.vat_amount)` |
| 5 | `src/pages/Index.tsx` سطر 37, `src/pages/Auth.tsx` سطر 62, `src/pages/Unauthorized.tsx` سطر 12 | `/beneficiary` → `/waqif` للواقف |
| 6 | `src/test/guardSignupSecurity.test.ts` + `docs/API.md` | `6` → `8` في الحد الأدنى لكلمة المرور |
| 7 | حذف `src/components/ui/calendar.tsx` + إزالة `react-day-picker` من `package.json` |

