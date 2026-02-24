# إصلاح المشكلة الوحيدة المتبقية: handleCreateAccount بدون try/catch

---

## نتيجة الفحص العميق

من 15+ مشكلة في التقرير، جميعها مُصلَحة بالفعل في الكود الحالي **ما عدا واحدة فقط**:

### المشكلة: `handleCreateAccount` في `AccountsPage.tsx` (سطر 260-292)

الدالة تستدعي `createAccount.mutateAsync(...)` مع `await`، لكن بدون `try/catch`. إذا فشل الحفظ:

- الخطأ يصبح unhandled promise rejection (لا رسالة خطأ للمستخدم)
- الإشعارات بعده لن تُرسَل (وهذا صحيح)، لكن المستخدم لا يعرف أن العملية فشلت

---

## القسم التقني

### التغيير المطلوب

**الملف:** `src/pages/dashboard/AccountsPage.tsx` (سطر 260-292)

لف الدالة بـ `try/catch` مع `toast.error` عند الفشل:

```text
const handleCreateAccount = async () => {
  try {
    await createAccount.mutateAsync({ ... });

    notifyAllBeneficiaries(...);
    if (manualDistributions > 0) {
      notifyAllBeneficiaries(...);
    }
  } catch (err) {
    toast.error('خطأ في حفظ الحسابات: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
  }
};
```

هذا تغيير واحد في ملف واحد فقط.  
  
نظف جميع الاخطاء بالتطبيق حتي لا يتم ظهورها عند الفحص 