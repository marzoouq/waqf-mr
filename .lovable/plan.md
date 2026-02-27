

# إصلاح 3 بنود متبقية

## ملخص التحقق
تم التحقق من الكود الفعلي لكل الملفات. من أصل 17 بنداً في التقرير:
- **13 بنداً مُصلحاً بالكامل** (مؤكد)
- **3 بنود قابلة للإصلاح الآن** (أدناه)
- بند واحد هيكلي (fiscal_year_id) يحتاج migration منفصل

---

## البند 1 (MEDIUM): إضافة `staleTime` + `.limit()` لـ 4 hooks في useAdvanceRequests

**الملف:** `src/hooks/useAdvanceRequests.ts`

**المشكلة:** 4 hooks بدون `staleTime` ولا `.limit()`:
- `useMyAdvanceRequests` (سطر 60)
- `usePaidAdvancesTotal` (سطر 80)
- `useCarryforwardBalance` (سطر 104)
- `useMyCarryforwards` (سطر 127)

**الإصلاح:** إضافة `staleTime: 60_000` لكل منها + `.limit(500)` حيث يُناسب (useMyAdvanceRequests و useMyCarryforwards). الـ `usePaidAdvancesTotal` و `useCarryforwardBalance` يجلبان عموداً واحداً (amount) لمستفيد واحد — الحجم محدود طبيعياً لكن `.limit(200)` إضافة دفاعية جيدة.

---

## البند 2 (HIGH): إصلاح `btoa(String.fromCharCode(...array))` في webauthn

**الملف:** `supabase/functions/webauthn/index.ts` سطر 142-143

**المشكلة:** استخدام spread operator على Uint8Array في `String.fromCharCode(...)`. إذا كان الـ publicKey أكبر من ~65,000 بايت (نادر لكن ممكن مع بعض المفاتيح)، يحدث "Maximum call stack size exceeded".

**الإصلاح:** استبدال بـ حلقة تكرارية آمنة:
```text
// قبل (خطر stack overflow):
const credIdBase64 = btoa(String.fromCharCode(...regCred.id));

// بعد (آمن):
const toBase64 = (arr: Uint8Array) =>
  btoa(Array.from(arr, b => String.fromCharCode(b)).join(''));
const credIdBase64 = toBase64(regCred.id);
const pubKeyBase64 = toBase64(regCred.publicKey);
```

`Array.from()` لا يستخدم spread على الـ call stack — آمن لأي حجم.

---

## البند 3 (معلومات فقط — لا إصلاح الآن): `fiscal_year_id` في جدول accounts

**المشكلة:** جدول `accounts` يربط بالسنة المالية عبر `fiscal_year` (نص) فقط. هذا يجعل البحث هشاً عند تغيير label السنة.

**لماذا لا نُصلحه الآن:**
- يحتاج migration لإضافة عمود `fiscal_year_id` (UUID) + foreign key
- يحتاج تحديث كل الكود الذي يقرأ/يكتب في `accounts` (useAccountsPage, useAccounts, AccountsPage, BeneficiaryDashboard...)
- يحتاج ربط الحسابات الموجودة بالسنوات المالية الصحيحة (data migration)
- تغيير هيكلي كبير يستحق جلسة مخصصة

---

## ترتيب التنفيذ
1. `useAdvanceRequests.ts` — إضافة staleTime + limit (4 hooks)
2. `webauthn/index.ts` — إصلاح btoa/fromCharCode

