

# مراجعة تفصيلية — خطة الجولة الخامسة بند بند

---

## أولاً: البنود المعتمدة للتنفيذ (10 إصلاحات)

### 🔴 SEC-03: استبدال `getSession()` في 4 ملفات

**الحالة:** مشكلة حقيقية مؤكدة بالكود

| الملف | السطر | الدليل |
|-------|-------|--------|
| `useInvoices.ts` | 247 | `const { data: { session } } = await supabase.auth.getSession()` |
| `useUserManagement.ts` | 23 | نفس النمط |
| `BeneficiariesPage.tsx` | 48 | نفس النمط |
| `useWebAuthn.ts` | 103 | نفس النمط |

**المشكلة:** `getSession()` يقرأ من localStorage مباشرة. Token منتهي أو مُلغى من الخادم يمكن استخدامه. توثيق المشروع نفسه (`README.md`) يقول: "Never use getSession()".

**الحل:** `supabase.functions.invoke()` يُرسل الـ token تلقائياً — لا حاجة لـ header يدوي. نحذف `getSession()` والـ header اليدوي.

---

### 🔴 HI-01: سجل `invoice_chain` يبقى بـ `PENDING` عند فشل Rollback

**الحالة:** مشكلة حقيقية — السطر 764 يطبع `console.error` فقط ولا يفعل شيئاً

**الخطر:** سلسلة PIH (Previous Invoice Hash) تنكسر. كل فاتورة لاحقة ستُرفض من ZATCA.

**الحل:** cron يحذف سجلات `invoice_hash = 'PENDING'` التي مضى عليها > 10 دقائق.

---

### 🔴 HI-02: تحديث hash في `zatca-signer` بدون فحص خطأ

**الحالة:** مشكلة حقيقية — السطر 733 لا يتحقق من `error`:
```
await admin.from("invoice_chain").update(...)  // لا يوجد: if (error) throw
```

**الخطر:** الدالة تُرجع `success: true` بينما الـ hash لا يزال `PENDING`.

**الحل:** إضافة `const { error } = await ...` مع `throw` عند الفشل.

---

### 🔴 HI-03: `zatca-xml-generator` يقرأ `PENDING` كـ previousHash

**الحالة:** مشكلة حقيقية — السطر 477-483:
```typescript
.order("icv", { ascending: false }).limit(1).single();
const previousHash = lastChain?.invoice_hash || "";
```
لا يوجد `.neq("invoice_hash", "PENDING")`.

**الحل:** إضافة `.neq("invoice_hash", "PENDING")` قبل `.order()`.

---

### 🟡 MED-07: ZATCA `reachable` check

**الحالة:** مشكلة حقيقية — السطر 297:
```typescript
const reachable = testRes.status > 0;  // حتى 500 = reachable!
```

**الحل:** `const reachable = testRes.status >= 200 && testRes.status < 500;`

---

### 🟡 MED-09: InvoiceViewer blob URL stale closure

**الحالة:** مشكلة حقيقية — السطر 54:
```typescript
if (blobUrl) { URL.revokeObjectURL(blobUrl); }
```
`blobUrl` في الـ cleanup يقرأ من الـ closure القديمة (وقت إنشاء الـ effect). إذا تغيرت القيمة بعد ذلك، الـ URL القديم لن يُحرَّر.

**الحل:** استخدام `useRef` لتتبع آخر blobUrl.

---

### 🟡 MED-10: rate_limits بدون cleanup

**الحالة:** مشكلة حقيقية — الجدول يحتوي `random() < 0.01` cleanup داخل `check_rate_limit` لكن هذا احتمالي وغير مضمون.

**الحل:** cron يومي يحذف السجلات > 24 ساعة.

---

### 🟡 HI-07: `useTotalBeneficiaryPercentage` يُرجع 0 صامتاً

**الحالة:** مشكلة حقيقية — السطر 19:
```typescript
if (result <= 0 || result > 200) return 0;
```
عند خطأ إداري (مجموع النسب > 200%)، كل المستفيدين يرون `0 ر.س` بدون أي تفسير.

**الحل:** إرجاع القيمة الحقيقية مع `toast.warning` تحذيري.

---

### 🟡 SEC-02 تعزيز: CHECK CONSTRAINT لشهادة PLACEHOLDER

**الحالة:** تعزيز مطلوب — `is_active: false` مُصلَح لكن لا حماية على مستوى DB.

**الحل:** 
```sql
ALTER TABLE zatca_certificates 
ADD CONSTRAINT no_placeholder_active 
CHECK (NOT (is_active = true AND certificate LIKE 'PLACEHOLDER%'));
```

---

### 🔵 تحديث اختبارات `getSession` القديمة

**الحالة:** ضرورة تبعية — بعد إزالة `getSession` من الكود، الاختبارات يجب أن تتوافق.

---

## ثانياً: البنود المحذوفة وأسبابها بالتفصيل

| # | البند | سبب الحذف | الدليل |
|---|-------|-----------|--------|
| SEC-01 | تدوير مفتاح التشفير | **عملية عالية الخطورة** — انظر القسم التفصيلي أدناه | — |
| SEC-04 | حماية `check-contract-expiry` بـ cron secret | **محمية فعلاً** — السطر 34 يتحقق من `service_role` عبر `timingSafeEqual(token, serviceKey)`. بدون `service_role` key، لا يمكن لأي طرف خارجي تشغيلها | `check-contract-expiry/index.ts:34` |
| HI-04 | cron لـ `cleanup_expired_challenges` | **مُصلَح في الجولة 4** — تمت جدولة cron يومي | — |
| HI-05 | migration مكررة | **لا ضرر فعلي** — Supabase يتتبع كل migration بالاسم ولا يُعيد تنفيذها. حذف الملف المكرر قد يُسبب مشاكل عند `supabase db reset` إذا كان مُسجلاً في `schema_migrations` | — |
| HI-06 | `limit(100)` في advance_requests | **حد معقول** — عدد طلبات السُلف في سنة مالية واحدة نادراً ما يتجاوز 100 في وقف واحد. pagination يُعقّد الواجهة بدون فائدة حالية | — |
| MED-01 | AI cache 5 دقائق | **مُصلَح في الجولة 4** — TTL = 60 ثانية + `?refresh=true` | — |
| MED-02 | الرسم البياني في FinancialReportsPage | **المنطق صحيح ومقصود** — "حصتي" مقابل "الإجمالي" هو العرض المطلوب (يُظهر نسبة المستفيد من الكل) | — |
| MED-03 | عمود `-` في ContractsViewPage | **مُصلَح في الجولة 4** — يعرض اسم العقار من `propertiesMap` | — |
| MED-04 | `pendingRef` بدون finally | **تقرير خاطئ** — السطر 148-149 يحتوي `finally { pendingRef.current = false }` بوضوح | `useMessaging.ts:148-149` |
| MED-05 | تناقض `allocate_icv_and_chain` | **لا ضرر** — `CREATE OR REPLACE` يُنفذ الأخير تلقائياً. النسخة الفعّالة هي الأحدث بـ `FOR UPDATE` | — |
| MED-06 | `getExpectedPaymentsFallback` deprecated | **مطلوب فعلاً** — عرض "جميع السنوات" يحتاج حساب من تاريخ البدء حتى اليوم. لا يوجد بديل عملي | — |
| MED-08 | waqif + support | **مُصلَح في الجولة 4** — `waqif` مُضاف لـ `support` | — |
| ARCH-01 | `accountant` ليس في ENUM الأصلي | **لا ضرر** — `ALTER TYPE ADD VALUE` في migration لاحقة يُضيفه بشكل دائم | — |
| ARCH-02 | `has_role()` N+1 | **تحسين أداء طويل الأمد** — يحتاج إعادة كتابة كل سياسات RLS. لا يؤثر على الوظائف حالياً | — |
| ARCH-03 | غياب Disaster Recovery | **توثيق وليس كود** — مهمة منفصلة | — |
| LOW-01/03/04/05/06/07 | اختبارات + جودة | **مهام منفصلة** — لا تؤثر على الأمان أو الوظائف | — |
| LOW-02 | استيراد مكرر لـ safeNumber | **تقرير خاطئ** — السطر 5 يستورد مرة واحدة فقط | `usePaymentInvoicesTab.ts:5` |

---

## ثالثاً: لماذا لا يتم تدوير المفتاح؟ — شرح تفصيلي

### الوضع الحالي

المفتاح مرّ بـ **4 مراحل** عبر الـ migrations:

1. **`20260302211548`** — أنشأ مفتاح عشوائي `encode(gen_random_bytes(32), 'hex')` في `app_settings`
2. **`20260302214500`** — شفّر بيانات المستفيدين (national_id, bank_account) بهذا المفتاح
3. **`20260318171433`** — نقل المفتاح من `app_settings` إلى Vault وحذفه من `app_settings`
4. **`20260320022807`** — أضاف fallback ثابت `'waqf-marzouq-pii-encryption-key-2024'` في Vault إذا لم يكن موجوداً

**المشكلة:** المفتاح الثابت في الخطوة 4 مكشوف في Git. لكن الخطوة 1 أنشأت مفتاحاً عشوائياً — فأي مفتاح يُستخدم فعلاً؟

### المشاكل التي تمنع التدوير

```text
┌─────────────────────────────────────────────────┐
│          عملية تدوير المفتاح (Key Rotation)      │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. إنشاء مفتاح جديد في Vault                    │
│     └── سهل ✅                                   │
│                                                   │
│  2. فك تشفير كل البيانات بالمفتاح القديم         │
│     └── ⚠️ أي مفتاح هو "القديم"؟               │
│        ├── المفتاح العشوائي من الخطوة 1؟         │
│        ├── المفتاح الثابت من الخطوة 4؟           │
│        └── بعض البيانات غير مشفرة أصلاً          │
│           (plaintext fallback في decrypt_pii)     │
│                                                   │
│  3. إعادة تشفير بالمفتاح الجديد                  │
│     └── ⚠️ خطر فقدان بيانات عند الفشل          │
│        ├── إذا فشل في منتصف العملية              │
│        ├── بعض السجلات بالمفتاح القديم           │
│        └── بعض السجلات بالمفتاح الجديد           │
│                                                   │
│  4. حذف المفتاح القديم                           │
│     └── ⚠️ لا يمكن التراجع بعدها               │
│                                                   │
│  5. المفتاح القديم يبقى في Git إلى الأبد         │
│     └── ❌ لا حل — حتى لو دوّرنا المفتاح       │
│        التاريخ يحفظ كل شيء                       │
│                                                   │
└─────────────────────────────────────────────────┘
```

### المخاطر الملموسة

| المخاطرة | التأثير | الاحتمال |
|----------|---------|----------|
| فشل في منتصف الـ migration → بيانات مختلطة بمفتاحين | **كارثي** — فقدان بيانات هوية المستفيدين | متوسط |
| المفتاح الفعلي ليس الثابت بل العشوائي → التدوير يعمل على المفتاح الخطأ | **كارثي** — كل فك التشفير يفشل | عالي دون فحص |
| Downtime أثناء العملية — النظام لا يستطيع قراءة البيانات المشفرة | **عالي** — توقف خدمة | مؤكد |

### كيف يُمكن حلها؟ (خطة مستقبلية)

**المرحلة 1: الفحص (بدون تغيير)**
- تنفيذ استعلام يحدد أي مفتاح مستخدم فعلاً في Vault الآن
- فحص عينة من البيانات المشفرة لمعرفة المفتاح الذي يفك تشفيرها
- تحديد عدد السجلات المشفرة vs غير المشفرة (plaintext)

**المرحلة 2: التدوير الآمن**
```sql
-- 1. إنشاء مفتاح جديد
SELECT vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'pii_encryption_key_v2');

-- 2. Re-encrypt في transaction واحد مع SAVEPOINT
BEGIN;
  SAVEPOINT before_rotation;
  
  UPDATE beneficiaries SET
    national_id = encode(
      pgp_sym_encrypt(
        pgp_sym_decrypt(decode(national_id, 'base64'), OLD_KEY),
        NEW_KEY
      ), 'base64'
    )
  WHERE national_id IS NOT NULL;
  
  -- فحص: هل يمكن فك التشفير بالمفتاح الجديد؟
  -- إذا فشل → ROLLBACK TO before_rotation
COMMIT;

-- 3. تحديث الدوال لتقرأ 'pii_encryption_key_v2'
-- 4. حذف المفتاح القديم من Vault
```

**المرحلة 3: منع التكرار**
- إضافة فحص CI/CD يرفض أي secret في ملفات `.sql`
- استخدام `supabase secrets set` حصراً للمفاتيح

**لماذا ليس الآن؟** لأن الخطوة 2 تحتاج:
1. معرفة المفتاح الفعلي المستخدم (يتطلب استعلام على Vault الحي)
2. نافذة صيانة (downtime مخطط)
3. نسخة احتياطية كاملة قبل البدء
4. اختبار على بيئة staging أولاً

---

## الملفات المتأثرة بالتنفيذ

| الملف | التغيير |
|-------|---------|
| `src/hooks/data/useInvoices.ts` | إزالة `getSession()` + header يدوي |
| `src/hooks/auth/useUserManagement.ts` | إزالة `getSession()` + header يدوي |
| `src/pages/dashboard/BeneficiariesPage.tsx` | إزالة `getSession()` + header يدوي |
| `src/hooks/auth/useWebAuthn.ts` | إزالة `getSession()` + header يدوي |
| `supabase/functions/zatca-signer/index.ts` | فحص خطأ تحديث hash (سطر 733) |
| `supabase/functions/zatca-xml-generator/index.ts` | `.neq("invoice_hash", "PENDING")` (سطر 477) |
| `supabase/functions/zatca-api/index.ts` | `reachable` check (سطر 297) |
| `src/components/invoices/InvoiceViewer.tsx` | `useRef` لـ blobUrl (سطر 51-56) |
| `src/hooks/financial/useTotalBeneficiaryPercentage.ts` | تحذير بدل return 0 |
| DB migration | CHECK CONSTRAINT + cron لـ rate_limits + cron لـ PENDING cleanup |
| اختبارات | تحديث `edgeFunctionAuth.test.ts` + `AuthContext.test.tsx` |

