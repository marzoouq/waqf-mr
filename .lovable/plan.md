
# خطة إصلاح 4 مشاكل متبقية

## ملخص
تم التحقق جنائياً من الكود الحالي (HEAD). جميع المشاكل الأربع مؤكدة ومطابقة للتقرير.

---

## الإصلاح 1: fail-closed لـ rate limit RPC (أمني - أولوية عالية)

**الملف:** `supabase/functions/lookup-national-id/index.ts` سطر 33

**المشكلة:** `{ data: isLimited }` يتجاهل `error`. إذا فشل RPC، `isLimited = null` ويتجاوز الحد.

**التغيير:**
- تغيير السطر 33 من `{ data: isLimited }` إلى `{ data: isLimited, error: rlError }`
- إضافة كتلة `if (rlError)` ترجع 503 قبل `if (isLimited)`

---

## الإصلاح 2: إضافة `.limit(10)` لـ `useAccountByFiscalYear`

**الملف:** `src/hooks/useAccounts.ts` سطر 39

**المشكلة:** بدون `.limit()` عند استدعائها بدون filter ترجع كل السجلات.

**التغيير:** إضافة `.limit(10)` بعد `.order(...)`

---

## الإصلاح 3: إضافة `per_page` و `staleTime` في `BeneficiariesPage`

**الملف:** `src/pages/dashboard/BeneficiariesPage.tsx` سطور 36-49

**المشكلة:** `list_users` بدون `per_page` يجلب الصفحة الأولى فقط (10-20 مستخدم). المستفيدون في صفحات لاحقة لا يظهرون في dropdown الربط.

**التغيير:**
- إضافة `staleTime: 60_000` للـ useQuery (سطر 37)
- إضافة `per_page: 100` في body الطلب (سطر 41)

---

## الإصلاح 4: `useMemo` لـ `paymentMap` و `collectionData`

**الملف:** `src/hooks/useAccountsPage.ts` سطور 191-236

**المشكلة:** `paymentMap` (reduce) و `collectionData` (map) تُعاد حسابهما في كل render بدون `useMemo`.

**التغيير:**
- لف `paymentMap` بـ `useMemo` مع dependency على `tenantPayments`
- لف `collectionData` بـ `useMemo` مع dependencies على `contracts` و `paymentMap`

---

## ترتيب التنفيذ

| # | الإصلاح | الملف | التعقيد |
|---|---|---|---|
| 1 | fail-closed rate limit | `lookup-national-id/index.ts` | بسيط (+8 سطور) |
| 2 | `.limit(10)` | `useAccounts.ts` | بسيط (+1 سطر) |
| 3 | `per_page` + `staleTime` | `BeneficiariesPage.tsx` | بسيط (+2 سطر) |
| 4 | `useMemo` | `useAccountsPage.ts` | بسيط (إعادة هيكلة) |

## الملفات المتأثرة
1. `supabase/functions/lookup-national-id/index.ts`
2. `src/hooks/useAccounts.ts`
3. `src/pages/dashboard/BeneficiariesPage.tsx`
4. `src/hooks/useAccountsPage.ts`
