

## فحص جنائي منهجي — التحقق من جميع بنود التقرير

### نتائج التحقق الكاملة

| # | البند | الحالة الفعلية | إجراء؟ |
|---|-------|---------------|--------|
| **C-1** | RLS مفتوح على `beneficiaries` | **مُصلح سابقاً** — السياسة الحالية: `user_id = auth.uid() OR admin OR accountant` | لا |
| **C-2** | `income`/`expenses` مكشوفة | **مُصلح سابقاً** — مقيّدة بـ `admin OR beneficiary OR waqif` + RESTRICTIVE للسنوات غير المنشورة | لا |
| **H-1** | مستفيد بدون `user_id` → حصة صفر صامتة | **MySharePage ✅** لديه guard (سطر 284). **BeneficiaryDashboard ❌ مفقود**. **DisclosurePage ❌ مفقود** | **نعم** |
| **H-2** | تناقض `fiscalYearId='all'` في MySharePage | بالتصميم — `useFinancialSummary` و `useCarryforwardBalance(undefined)` كلاهما يجمع من كل السنوات | لا |
| **H-3** | Fallback سُلفة على العميل | **محمي** — trigger `validate_advance_request_amount` يحمي النهاية | لا |
| **M-1** | Fallback `useBeneficiariesDecrypted` يعرض PII مقنّع | بالتصميم — `***` أفضل من فشل كامل | لا |
| **M-2** | المستفيد يعدّل `share_percentage`؟ | **محمي** — RLS: فقط `admin` و `accountant` لديهم `ALL` | لا |
| **M-3** | `noPublishedYears` guard مكرر في 14+ صفحة | **مؤكد** — لكن تغيير هيكلي واسع. مؤجل لجولة refactoring | لا |
| **M-4** | `staleTime` 5 دقائق لبيانات المستفيدين | قرار تصميمي — بيانات المستفيد (اسم، نسبة) لا تتغير كثيراً. 5 دقائق مقبول | لا |
| **L-1** | اسم افتراضي "مستفيد" | تجميلي بسيط — لكن يُحل ضمن H-1 بعرض رسالة واضحة بدل المحتوى الفارغ | لا |

---

### الإصلاح الوحيد المطلوب: H-1 — guard في ملفين

**1. `src/pages/beneficiary/BeneficiaryDashboard.tsx`**

بعد guard `noPublishedYears` (سطر 178)، إضافة:
```tsx
if (!currentBeneficiary && !benLoading) {
  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4">
        <Card className="shadow-sm border-warning/30 bg-warning/5">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
            <AlertCircle className="w-12 h-12 text-warning" />
            <h2 className="text-lg font-bold">حسابك غير مرتبط</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع الناظر لربط حسابك.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

**2. `src/pages/beneficiary/DisclosurePage.tsx`**

بعد guard `isAccountMissing` (سطر 231)، إضافة نفس guard:
```tsx
if (!currentBeneficiary) {
  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-16 h-16 text-warning" />
        <h2 className="text-xl font-bold">حسابك غير مرتبط</h2>
        <p className="text-muted-foreground text-center max-w-md">
          حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

**ملاحظة:** `MySharePage.tsx` لديه بالفعل هذا الـ guard في سطر 284 — لا يحتاج تعديل.

### ملخص
- **ملفان فقط** يُعدَّلان
- لا تغييرات في قاعدة البيانات
- إصلاح واحد محدد: منع عرض بيانات مضللة (حصة = 0) لمستفيد غير مربوط
