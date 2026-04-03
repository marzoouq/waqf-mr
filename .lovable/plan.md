

# خطة تحديث مراجع الهوكات المتبقية

## المشكلة الفعلية
بعد حذف ملفات الـ shim الستة، بقيت **18 مرجعاً قديماً** داخل ملفات الاختبار (`.test.ts/.test.tsx`) تستخدم `vi.mock(...)` مع مسارات محذوفة. هذا هو السبب الحقيقي لأخطاء `TS2307`.

الملفات المتأثرة ليست في كود الإنتاج — كلها في ملفات اختبار تستخدم `vi.mock()`.

## الملفات المطلوب تحديثها (18 ملف)

### تغيير `@/hooks/page/useAppSettings` → `@/hooks/data/useAppSettings` (16 ملف)
- `src/components/layout/DashboardLayout.test.tsx`
- `src/components/layout/Sidebar.test.tsx`
- `src/hooks/data/usePdfWaqfInfo.test.ts`
- `src/hooks/financial/useAccountsPage.test.ts`
- `src/hooks/financial/useFinancialSummary.test.ts`
- `src/hooks/financial/useRawFinancialData.test.ts`
- `src/pages/beneficiary/AccountsViewPage.test.tsx`
- `src/pages/beneficiary/FinancialReportsPage.test.tsx`
- `src/pages/beneficiary/MySharePage.test.tsx`
- `src/pages/beneficiary/NotificationsPage.test.tsx`
- `src/pages/beneficiary/BylawsViewPage.test.tsx`
- `src/pages/dashboard/InvoicesPage.test.tsx`
- `src/pages/dashboard/SettingsPage.test.tsx`
- `src/pages/dashboard/ZatcaManagementPage.test.tsx`
- `src/pages/dashboard/BylawsPage.test.tsx`
- `src/pages/PublicPages.test.tsx`

### تغيير `@/hooks/page/useDashboardSummary` → `@/hooks/data/useDashboardSummary` (1 ملف)
- `src/pages/dashboard/AdminDashboard.test.tsx`

### تغيير `@/hooks/ui/useUnreadMessages` → `@/hooks/data/useUnreadMessages` (1 ملف)
- `src/components/layout/BottomNav.test.tsx`

## ملاحظة إضافية: ملفات barrel مفقودة
مجلدا `hooks/page/` و `hooks/ui/` لا يحتويان على `index.ts` (barrel exports). سيتم إنشاء ملف barrel لكل منهما لتوحيد الاستيراد مع باقي المجلدات (`hooks/data/index.ts`, `hooks/auth/index.ts`, `hooks/financial/index.ts`).

## خطوات التنفيذ

1. **استبدال المسارات القديمة** في الـ 18 ملف اختبار المذكورة أعلاه
2. **إنشاء `src/hooks/page/index.ts`** — barrel exports لجميع هوكات page المتبقية
3. **إنشاء `src/hooks/ui/index.ts`** — barrel exports لجميع هوكات ui المتبقية
4. **تحقق نهائي** بـ `npx tsc --noEmit`

