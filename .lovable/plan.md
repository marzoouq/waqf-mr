

# تقرير التحقق الجنائي — النتائج الفعلية من الكود الحالي

## ملخص: من 14 ادعاء في التقرير، مشكلتان فقط حقيقيتان

معظم المشاكل المُبلَّغ عنها **تم إصلاحها مسبقاً** في الجولات السابقة. التقرير المُقدَّم يستند إلى commits قديمة وليس الكود الحالي.

---

## بنود مُصلحة مسبقاً (التقرير خاطئ بشأنها)

| # | الادعاء | الحقيقة من الكود الحالي |
|---|---------|------------------------|
| #1 | `cron_check_contract_expiry` يُرسل `tenant_name` للمستفيدين | **مُصلح** -- الدالة في DB تستخدم `ben_msg` عام (مؤكد من schema الحالي) |
| #2 | `fetchWaqfData` لا تُفرّق بين الأدوار | **مُصلح** -- `isAdmin` في سطر 207، فلترة في سطور 232/274/342 |
| #3 | `generate-invoice-pdf` بدون تحقق يدوي | **مُصلح** -- `getUser()` في سطر 400 + role check في سطر 426-436 |
| #4 | TOCTOU في `useUpdateAdvanceStatus` | **مُصلح** -- `.in('status', allowedFrom)` في سطر 240 (atomic guard) |
| #7 | `useAccountsPage` error.message في saveSetting وcloseYear | **مُصلح** -- سطر 109: `console.error` + toast ثابت. سطر 352: نفس الشيء |
| #10 | كل Edge Functions بـ `verify_jwt=false` | **بالتصميم** -- كل دالة تتحقق يدوياً عبر `getUser()` + role check |
| #14 | `webauthn` بدون default handler | **مُصلح** -- سطر 304: `return ... "إجراء غير معروف"` |
| .env | `.env` مرفوع في GitHub | **طبيعي** -- Lovable Cloud يدير `.env` تلقائياً، يحتوي فقط مفاتيح عامة |

---

## المشكلتان الحقيقيتان المتبقيتان

### 1. [متوسط] `check-contract-expiry` Edge Function -- يُرسل `tenant_name` لجميع المستفيدين

**الملف:** `supabase/functions/check-contract-expiry/index.ts` سطر 155

```text
const msg = `عقد رقم ${contract.contract_number} (${contract.tenant_name}) ينتهي خلال ${daysLeft} يوم`;
// ثم يُرسل msg لكل allRecipients بما فيهم المستفيدين
```

ملاحظة: دالة `cron_check_contract_expiry` في DB تم إصلاحها (تستخدم `ben_msg`)، لكن Edge Function المنفصلة لا تزال تُرسل نفس الرسالة التفصيلية للجميع.

**الإصلاح:** فصل الرسالة حسب الدور -- رسالة عامة للمستفيدين بدون `tenant_name`.

### 2. [منخفض] `useAccountsPage` -- `handleCreateAccount` يكشف `error.message` في toast

**الملف:** `src/hooks/useAccountsPage.ts` سطر 280

```text
toast.error('خطأ في حفظ الحسابات: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
```

تم إصلاح `saveSetting` (سطر 109) و `handleCloseYear` (سطر 352) لكن `handleCreateAccount` لا يزال يكشف الرسالة.

**الإصلاح:** `console.error` + toast ثابت.

---

## ملخص التغييرات المطلوبة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/check-contract-expiry/index.ts` | فصل رسالة المستفيدين عن رسالة الأدمن (بدون tenant_name) |
| `src/hooks/useAccountsPage.ts` سطر 280 | تعقيم error.message في handleCreateAccount |

