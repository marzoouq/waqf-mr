

# فحص صفحات المستفيد — النتائج والإصلاحات المطلوبة

---

## نتائج الفحص

### ✅ صفحات سليمة (Guards كاملة)

| الصفحة | Loading | Error | مستفيد غير مرتبط | حساب مفقود | RequirePublishedYears |
|--------|:---:|:---:|:---:|:---:|:---:|
| **MySharePage** | ✅ | ✅ | ✅ | — | ✅ |
| **DisclosurePage** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FinancialReportsPage** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### 🟡 M-01: AccountsViewPage — guard المستفيد غير المرتبط مفقود

**الملف:** `src/pages/beneficiary/AccountsViewPage.tsx`

**المشكلة:** الصفحة لا تعرض رسالة "حسابك غير مرتبط" عند عدم وجود `currentBeneficiary`. بدلاً من ذلك تعرض الأرقام العامة مع إخفاء بطاقة "حصتي" فقط بشرط `{currentBeneficiary && ...}`.

**التأثير:** منخفض — الصفحة تعمل لكنها غير متسقة مع باقي الصفحات.

**الإصلاح:** إضافة guard بعد فحص `isAccountMissing` (سطر 94):
```typescript
if (!currentBeneficiary && !finLoading) {
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

---

### 🟡 M-02: تحذيرات Recharts — أبعاد سالبة (-1 × -1)

**المصدر:** Console logs — `The width(-1) and height(-1) of chart should be greater than 0`

**الملف:** `src/components/financial/FinancialChartsInner.tsx`

**المشكلة:** `ResponsiveContainer` يُعرض قبل أن يحصل الحاوي الأب على أبعاد فعلية (خاصة عند lazy loading مع `Suspense`). هذا يولّد 6 تحذيرات في Console.

**الإصلاح:** إضافة `minHeight` و `minWidth` لـ `ResponsiveContainer`:
```typescript
<ResponsiveContainer width="100%" height={250} minWidth={1}>
```
هذا يمنع القيم السالبة ويزيل التحذيرات.

---

## ملخص

| # | البند | الحالة | أولوية |
|---|-------|--------|--------|
| M-01 | AccountsViewPage بلا guard مستفيد | 🟡 تحسيني | منخفضة |
| M-02 | تحذيرات Recharts أبعاد سالبة | 🟡 تحسيني | منخفضة |
| DisclosurePage | جميع Guards سليمة | ✅ | — |
| MySharePage | جميع Guards سليمة | ✅ | — |
| FinancialReportsPage | جميع Guards سليمة | ✅ | — |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/beneficiary/AccountsViewPage.tsx` | إضافة guard المستفيد غير المرتبط |
| `src/components/financial/FinancialChartsInner.tsx` | إضافة `minWidth={1}` لإزالة تحذيرات Recharts |

