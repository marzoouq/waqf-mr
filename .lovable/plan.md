

# تنفيذ الإصلاح F-01: إضافة guard للمستفيد غير المرتبط في التقارير المالية

---

## البند والسيناريو

**F-01**: `FinancialReportsPage` لا يتحقق من ارتباط حساب المستفيد، بينما `DisclosurePage` و `MySharePage` يفعلان ذلك.

**السيناريو**: مستفيد جديد (حسابه غير مرتبط بسجل مستفيد) يفتح "التقارير المالية" ← يرى رسوم بيانية بأرقام صفرية بلا توضيح ← **تجربة مربكة**.

**النتيجة المطلوبة**: عرض رسالة واضحة "حسابك غير مرتبط" بدلاً من رسوم بيانية فارغة.

---

## التغيير

**ملف واحد**: `src/pages/beneficiary/FinancialReportsPage.tsx`

إضافة guard بعد فحص `isAccountMissing` (سطر 142):

```typescript
if (!currentBeneficiary && !isLoading) {
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

هذا يجعل الصفحات الثلاث (Disclosure, MyShare, FinancialReports) متسقة في التعامل مع الحسابات غير المرتبطة.

