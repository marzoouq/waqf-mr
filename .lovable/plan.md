

# خطة الإصلاح الشاملة — 12 بند مُتحقق جنائياً

## ملخص
تم التحقق من كل بند مقابل الكود الفعلي. جميع المشاكل الـ 12 مؤكدة. الخطة تُنفذ بالترتيب التالي:

---

## المجموعة 1: إصلاحات أمنية في WebAuthn (خطورة عالية)

### الخطوة 1: إزالة `email` من استجابة `auth-verify`
**الملف:** `supabase/functions/webauthn/index.ts` سطر 255-259

حذف `email: userData.user.email` من الاستجابة. الـ client (سطر 132 في `useWebAuthn.ts`) يستخدم `token_hash` فقط.

### الخطوة 2: إصلاح race condition في `auth-options`/`auth-verify`
**الملفات:** `supabase/functions/webauthn/index.ts` + `src/hooks/useWebAuthn.ts`

- في `auth-options` (سطر 173-178): تعديل الـ insert ليُرجع `id` ثم إضافة `challenge_id` في الاستجابة
- في `auth-verify` (سطر 186-192): استبدال `ORDER BY created_at DESC LIMIT 1` بـ `.eq("id", challenge_id)`
- في `useWebAuthn.ts` (سطر 109-124): تمرير `challenge_id` من `options` إلى `auth-verify`

### الخطوة 3: إضافة origin whitelist لـ `getRpInfo`
**الملف:** `supabase/functions/webauthn/index.ts` سطر 25-37

استيراد `getAllowedOrigin` من `cors.ts` واستخدام نفس المنطق الموجود (الذي يدعم `*.lovable.app` و `*.lovableproject.com` والنطاقات المحددة) للتحقق من الـ origin قبل استخدامه كـ `rpID`.

### الخطوة 4: إضافة error check لـ `getUserById`
**الملف:** `supabase/functions/webauthn/index.ts` سطر 241

تغيير من `const { data: userData }` إلى `const { data: userData, error: userError }` وإضافة فحص `userError`.

### الخطوة 5: حذف challenge محدد في `register-verify`
**الملف:** `supabase/functions/webauthn/index.ts` سطر 157

تغيير `.eq("type", "registration")` إلى `.eq("challenge", challengeRow.challenge)` لحذف التحدي المُستخدم فقط.

---

## المجموعة 2: إصلاح rate limiting (خطورة عالية)

### الخطوة 6: نقل rate limiting لقاعدة البيانات
**الملفات:**
- Migration جديد: إنشاء جدول `rate_limits` + دالة `check_rate_limit` RPC
- `supabase/functions/lookup-national-id/index.ts`: استبدال `rateLimitMap` و `setInterval` باستدعاء RPC

```text
جدول rate_limits:
  key (text PK) | count (int) | window_start (timestamptz)

دالة check_rate_limit(p_key text, p_limit int, p_window_seconds int):
  - إذا انتهت النافذة: إعادة تعيين العداد
  - إذا لم تنتهِ: زيادة العداد
  - إرجاع true إذا تجاوز الحد
```

RLS: لا وصول مباشر (الجدول يُستخدم فقط عبر service role في Edge Function).

---

## المجموعة 3: تحسينات أداء وسلامة (متوسطة-منخفضة)

### الخطوة 7: `useTenantPayments` — إضافة `limit` و `staleTime`
**الملف:** `src/hooks/useTenantPayments.ts` سطر 30-37

إضافة `.limit(500)` و `staleTime: 60_000`.

### الخطوة 8: `handleCloseYear` — error check للـ insert الصامت
**الملف:** `src/hooks/useAccountsPage.ts` سطر 319-329

استخراج `error` من الـ insert وعرض toast تحذيري عند الفشل (بدون إيقاف العملية لأن الإقفال نفسه نجح).

### الخطوة 9: `useMemo` لحسابات `useAccountsPage`
**الملف:** `src/hooks/useAccountsPage.ts` سطر 139-169

لف `computeTotals`، `calculateFinancials`، `groupIncomeBySource`، `groupExpensesByType` بـ `useMemo`.

### الخطوة 10: `useAuditLog` — إضافة `staleTime`
**الملف:** `src/hooks/useAuditLog.ts`

إضافة `staleTime: 30_000`.

### الخطوة 11: `fetchCredentials` — إضافة `.limit(20)`
**الملف:** `src/hooks/useWebAuthn.ts` سطر 24-27

### الخطوة 12: `useDistribute` — إزالة `as any`
**الملف:** `src/hooks/useDistribute.ts`

استبدال `distributions as any` بـ `JSON.parse(JSON.stringify(distributions))`.

---

## ترتيب التنفيذ

| الأولوية | الخطوات | الملفات | التعقيد |
|---|---|---|---|
| عالية | 1-5 | `webauthn/index.ts` + `useWebAuthn.ts` | متوسط |
| عالية | 6 | `lookup-national-id/index.ts` + migration | متوسط |
| متوسطة | 7-8 | `useTenantPayments.ts` + `useAccountsPage.ts` | بسيط |
| منخفضة | 9-12 | hooks متعددة | بسيط |

## الملفات المتأثرة
1. `supabase/functions/webauthn/index.ts` (خطوات 1-5)
2. `src/hooks/useWebAuthn.ts` (خطوات 2, 11)
3. `supabase/functions/lookup-national-id/index.ts` (خطوة 6)
4. Migration جديد لـ `rate_limits` (خطوة 6)
5. `src/hooks/useTenantPayments.ts` (خطوة 7)
6. `src/hooks/useAccountsPage.ts` (خطوات 8, 9)
7. `src/hooks/useAuditLog.ts` (خطوة 10)
8. `src/hooks/useDistribute.ts` (خطوة 12)

