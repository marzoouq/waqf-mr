

# الجلسة العاشرة — تحسينات هيكلية

## نتائج الفحص الجنائي للملفات المهملة

| الملف/الدالة | حالة الاستخدام | القرار |
|---|---|---|
| `src/hooks/financial/usePrefetchAccounts.ts` | **صفر استيرادات** خارج الملف نفسه | ✅ حذف |
| `src/hooks/financial/usePrefetchAccounts.test.ts` | اختبار للملف أعلاه | ✅ حذف |
| `usePrefetchAccounts()` في `usePrefetchPages.ts` سطر 121–124 | **صفر استيرادات** — compat export لم يُستخدم قط | ✅ حذف التصدير |
| `getPaymentStatus()` في `helpers.ts` سطر 76–97 | **صفر استيرادات** خارج الملف — deprecated | ✅ حذف |
| `getExpectedPaymentsFallback()` في `useCollectionData.ts` | **مستخدمة داخلياً** كـ fallback | ❌ إبقاء |
| `paymentInvoiceShared.ts` | مُستثنى من التقسيم حسب قرار سابق | ❌ إبقاء |

---

## خطة التنفيذ (4 مهام)

### المهمة 1: حذف الملفات والدوال المهملة
- حذف `src/hooks/financial/usePrefetchAccounts.ts`
- حذف `src/hooks/financial/usePrefetchAccounts.test.ts`
- حذف `usePrefetchAccounts()` compat export من `usePrefetchPages.ts` (سطور 120–124)
- حذف `getPaymentStatus()` من `helpers.ts` (سطور 76–97)

### المهمة 2: استخراج `useAuthPage` من `Auth.tsx`
الملف 206 سطر مع 5 `useEffect`. استخراج hook:

**ملف جديد**: `src/hooks/page/useAuthPage.ts`
- نقل الـ effects الخمسة: online/offline، PWA install، idle logout، redirect، role timeout
- نقل `useQuery` لإعداد التسجيل
- نقل states: `resetMode`, `isOffline`, `installPrompt`, `isAppInstalled`, `roleWaitTimeout`

**`Auth.tsx`** يصبح:
```ts
const { resetMode, setResetMode, isOffline, installPrompt, isAppInstalled,
        roleWaitTimeout, registrationEnabled, user, loading, role,
        signIn, signUp, signOut, navigate } = useAuthPage();
```
→ الصفحة تصبح ~100 سطر JSX فقط

### المهمة 3: تقسيم `useContractsPage.ts` (385 سطر)
**ملف جديد**: `src/hooks/page/useContractsFilters.ts`
استخراج:
- `groupedContracts` useMemo
- `overdueContractIds` useMemo
- `statusCounts` useMemo
- `filteredGroups` useMemo مع states التصفية (`statusFilter`, `propertyFilter`, `paymentTypeFilter`, `searchQuery`)
- `expandedGroups` state و `toggleAllGroups`

**ملف جديد**: `src/hooks/page/useContractsBulkRenew.ts`
استخراج:
- `handleBulkRenew` + states المرتبطة (`bulkRenewOpen`, `bulkRenewing`, `selectedForRenewal`)
- `toggleSelection`, `selectAllExpired`, `deselectAll`

**`useContractsPage.ts`** يبقى فيه:
- data fetching hooks
- `handleFormSubmit`, `handleEdit`, `handleRenew`, `handleConfirmDelete`
- `stats` useMemo
- تجميع العودة من الـ sub-hooks

→ كل ملف ~120–150 سطر

### المهمة 4: تحقق من البناء
- `npx tsc --noEmit` للتأكد من عدم وجود أخطاء

---

## ملاحظة: `paymentInvoiceShared.ts`
تم استثناؤه صراحةً من التقسيم في جلسة سابقة بسبب تعقيد منطق الفواتير المشترك والمخاطر العالية. يبقى كما هو.

