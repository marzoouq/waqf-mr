
# تنفيذ الدورة الرابعة — 18 مهمة مُحققة

## التحقق المكتمل

جميع النقاط الـ 18 **مؤكدة بالكود الفعلي**:
- `useDistributionAdvances.ts`: لا `staleTime` (سطر 8, 25)
- `useAdvanceRequests.ts`: `STALE_REALTIME` (سطر 29)
- `useExpenses.ts`: `.limit(1000)` في `all` vs `PER_FY_LIMIT` (2000) في `useIncome.ts`
- `useBeneficiaryDashboardData.ts`: queryKey بدون `user.id` (سطر 66)، لا فحص `isFyAll` (سطر 67)
- `useRegistrationEnabled`: نسختان بـ `staleTime` مختلف (`STALE_STATIC` vs `STALE_SETTINGS`)

---

## الأسبوع 1 — إصلاحات Hooks (6 مهام)

### 1. توحيد حد `useExpenses` (#35)
**ملف:** `src/hooks/data/financial/useExpenses.ts` سطر 42
- تغيير `.limit(1000)` → `.limit(PER_FY_LIMIT)`

### 2. إضافة `staleTime` لـ distribution hooks (#26)
**ملف:** `src/hooks/data/financial/useDistributionAdvances.ts`
- إضافة `staleTime: STALE_FINANCIAL` لكلا الهوكين

### 3. تغيير `STALE_REALTIME` → `STALE_FINANCIAL` (#32)
**ملف:** `src/hooks/data/financial/useAdvanceRequests.ts` سطر 29

### 4. إضافة `user.id` لـ queryKey (#41)
**ملف:** `src/hooks/data/beneficiaries/useBeneficiaryDashboardData.ts` سطر 66
- `queryKey: ['beneficiary-dashboard', user?.id, fiscalYearId]`

### 5. توحيد `useRegistrationEnabled` (#43+#100)
- حذف النسخة من `src/hooks/auth/useUserManagementData.ts` (سطور 27-39)
- تحديث imports في `useUserManagement.ts` و `auth/index.ts` لتستورد من `@/hooks/data/settings`

### 6. إضافة فحص `isFyAll` (#54)
**ملف:** `src/hooks/data/beneficiaries/useBeneficiaryDashboardData.ts` سطر 67
- `enabled: !!user && fyReady && !isFyAll(fiscalYearId)`

---

## الأسبوع 2 — إصلاحات DB (6 مهام) — migrations

### 7. تقريب عدد المستفيدين في `get_public_stats` (#4)
```sql
'beneficiaries', (SELECT floor(count(*)::numeric / 10) * 10 FROM public.beneficiaries)
```

### 8. حد لـ `ai_chat_sessions` (#11+#12)
- حد messages: trigger يمنع تجاوز 500 رسالة
- حد جلسات: trigger يحذف الأقدم عند تجاوز 50 جلسة

### 9. منع تداخل السنوات المالية (#73)
- trigger يفحص `daterange` overlap قبل INSERT/UPDATE

### 10. منع circular reference في `account_categories` (#61)
- trigger يتتبع سلسلة `parent_id` ويمنع الدورات

### 11. فحص `paid_amount` عند حذف الفواتير (#2)
- إضافة `AND (paid_amount IS NULL OR paid_amount = 0)` في `generate_contract_invoices`

### 12. تغيير `TO public` → `TO authenticated` (#13)
- تحديث policies في `account_categories`

---

## الأسبوع 3 — اختبارات (6 مهام)

### 13. اختبارات Penny Allocation (#37)
**ملف جديد:** `src/hooks/page/admin/useDistributionCalculation.test.ts`
- 1000 ÷ 3 مستفيدين (33.33%)
- مبلغ صفر
- مستفيد واحد
- مبلغ 999.99

### 14-18. اختبارات هوكات مالية أخرى
- `useYearComparisonData` transforms
- `useMultiYearSummary` mapEntry
- `useBeneficiaryDashboardData` response validation
- `useDistributionHistory` casting
- `usePaidAdvances`/`useActiveCarryforwards`

---

## ملخص التأثير

| الأسبوع | الملفات | خطر الكسر |
|---------|---------|----------|
| 1 | 5 ملفات (حذف جزء من 1) | صفر — تغييرات داخلية |
| 2 | 1 migration جديد | منخفض — DB triggers دفاعية |
| 3 | 6 ملفات اختبار جديدة | صفر — اختبارات فقط |
