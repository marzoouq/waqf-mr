

# إصلاح 6 بنود معلّقة

## ملخص
6 مشاكل تم التحقق منها في الكود الفعلي وجميعها لا تزال قائمة.

---

## البند 1 (MEDIUM): إزالة N+1 query من BeneficiariesPage

**الملف:** `src/pages/dashboard/BeneficiariesPage.tsx` سطر 36-50

**المشكلة:** الصفحة تستدعي `list_users` (الذي يُرجع `role` لكل مستخدم في سطر 119 من Edge Function) ثم تستعلم `user_roles` مرة أخرى بشكل منفصل. استعلام زائد تماماً.

**الإصلاح:**
- حذف استعلام `supabase.from('user_roles')` الزائد (سطر 46-47)
- تصفية المستخدمين مباشرة من الاستجابة باستخدام `u.role === 'beneficiary'`
- تبسيط الكود من 12 سطر إلى 6 أسطر

---

## البند 2-5 (LOW): إضافة staleTime لـ 4 hooks مالية

| الملف | السطر | Hook |
|-------|-------|------|
| `src/hooks/useAccounts.ts` | 30 | `useAccountByFiscalYear` |
| `src/hooks/useFiscalYears.ts` | 18 | `useFiscalYears` |
| `src/hooks/useExpenses.ts` | 38 | `useExpensesByFiscalYear` |
| `src/hooks/useAdvanceRequests.ts` | 40 | `useAdvanceRequests` |

**الإصلاح:** إضافة `staleTime: 60_000` لكل hook للتناسق مع `useIncomeByFiscalYear` و `useInvoicesByFiscalYear`.

---

## البند 6 (LOW): تأمين logger.error في Production

**الملف:** `src/lib/logger.ts` سطر 10

**المشكلة:** `logger.error` يطبع التفاصيل الكاملة في production console. التعليق في الملف يقول "يُسكت كل شيء" لكن `error` مستثنى.

**الإصلاح:**
```text
error: (...args: unknown[]) => {
  if (isDev) {
    console.error(...args);
  } else {
    console.error('[App Error]');
  }
},
```

---

## ترتيب التنفيذ
1. BeneficiariesPage (N+1 fix)
2. 4 hooks (staleTime) — تعديلات متوازية
3. logger.ts (error guard)

