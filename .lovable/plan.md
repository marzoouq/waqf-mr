

# تقسيم AccountsPage.tsx إلى مكونات فرعية

## المبدأ الأساسي
نقل JSX فقط إلى مكونات فرعية مع تمرير البيانات والدوال كـ Props. المنطق الحسابي والحالة (state) تبقى في الصفحة الرئيسية بدون أي تغيير.

## المكونات الفرعية المقترحة

### 1. `components/accounts/AccountsSettingsBar.tsx`
- شريط الإعدادات (السطور 412-507)
- يستقبل Props: القيم الحالية (fiscalYear, adminPercent, waqifPercent, الخ) + دوال التغيير + calculatedVat + commercialRent + vatPercentage

### 2. `components/accounts/AccountsSummaryCards.tsx`
- بطاقات الملخص المالي (السطور 509-581)
- يستقبل Props: جميع القيم المالية المحسوبة (totalIncome, totalExpenses, adminShare, الخ)

### 3. `components/accounts/AccountsContractsTable.tsx`
- جدول العقود (السطور 583-646)
- يستقبل Props: contracts, getPaymentPerPeriod, getExpectedPayments, totalPaymentPerPeriod, totalAnnualRent, statusLabel, handleOpenContractEdit, setDeleteTarget

### 4. `components/accounts/AccountsCollectionTable.tsx`
- جدول التحصيل والمتأخرات (السطور 648-779)
- يستقبل Props: collectionData, editingIndex, editData, setEditData, handleStartEdit, handleCancelEdit, handleSaveEdit, totals, isPending flags

### 5. `components/accounts/AccountsIncomeTable.tsx`
- تفصيل الإيرادات (السطور 781-817)
- يستقبل Props: income, incomeBySource, totalIncome

### 6. `components/accounts/AccountsExpensesTable.tsx`
- تفصيل المصروفات (السطور 819-855)
- يستقبل Props: expenses, expensesByType, totalExpenses

### 7. `components/accounts/AccountsDistributionTable.tsx`
- جدول التوزيع والحصص (السطور 857-962)
- يستقبل Props: جميع القيم المالية من التسلسل الهرمي

### 8. `components/accounts/AccountsBeneficiariesTable.tsx`
- جدول توزيع حصص المستفيدين (السطور 964-1006)
- يستقبل Props: beneficiaries, manualDistributions, totalBeneficiaryPercentage

### 9. `components/accounts/AccountsSavedTable.tsx`
- السجلات السابقة (السطور 1008-1056)
- يستقبل Props: accounts, isLoading, setDeleteTarget

### 10. `components/accounts/AccountsDialogs.tsx`
- حوارات التعديل والحذف (السطور 1058-1124)
- يستقبل Props: deleteTarget, setDeleteTarget, handleConfirmDelete, contractEditOpen, setContractEditOpen, editingContractData, setEditingContractData, handleSaveContractEdit, isPending

## النتيجة المتوقعة

`AccountsPage.tsx` سيتقلص من **1,130 سطر** إلى حوالي **350-400 سطر** تحتوي فقط على:
- استدعاء الـ Hooks
- إدارة الحالة (useState/useEffect)
- المنطق الحسابي والدوال
- تركيب المكونات الفرعية مع تمرير Props

## القسم التقني

### هيكل الملفات الجديدة
```text
src/components/accounts/
  AccountsSettingsBar.tsx
  AccountsSummaryCards.tsx
  AccountsContractsTable.tsx
  AccountsCollectionTable.tsx
  AccountsIncomeTable.tsx
  AccountsExpensesTable.tsx
  AccountsDistributionTable.tsx
  AccountsBeneficiariesTable.tsx
  AccountsSavedTable.tsx
  AccountsDialogs.tsx
```

### مثال على الشكل النهائي لـ AccountsPage.tsx (الجزء JSX)
```text
return (
  <DashboardLayout>
    <div className="p-6 space-y-6">
      {/* Header + Buttons */}
      ...
      <AccountsSettingsBar ... />
      <AccountsSummaryCards ... />
      <AccountsContractsTable ... />
      <AccountsCollectionTable ... />
      <AccountsIncomeTable ... />
      <AccountsExpensesTable ... />
      <AccountsDistributionTable ... />
      <AccountsBeneficiariesTable ... />
      <AccountsSavedTable ... />
      <AccountsDialogs ... />
    </div>
  </DashboardLayout>
);
```

### ضمانات السلامة
- لا تغيير في أي منطق حسابي أو حالة
- لا تغيير في أي استعلام قاعدة بيانات
- لا تغيير في أي دالة handler
- كل مكون يستقبل بياناته كـ Props من الصفحة الرئيسية
- الملف الأصلي يحتفظ بكامل المنطق ويتم تبسيط JSX فقط

