

# تشغيل جميع الاختبارات

## الهدف
تشغيل جميع اختبارات Vitest الموجودة في المشروع للتحقق من سلامة الكود بعد التعديلات الأخيرة.

## الاختبارات المتوفرة
المشروع يحتوي على اختبارات متعددة تغطي:

- **Hooks**: useAccounts, useBeneficiaries, useContracts, useExpenses, useIncome, useInvoices, useProperties, useUnits, وغيرها
- **Components**: DashboardLayout, ErrorBoundary, ExportMenu, Sidebar, TablePagination, وغيرها
- **Pages**: AdminDashboard, AccountsPage, BeneficiariesPage, ContractsPage, وصفحات المستفيدين
- **Utils**: accountsCalculations, maskData, notifications, pdf/core
- **Contexts**: AuthContext, FiscalYearContext
- **Security**: roles-security, guardSignupSecurity, edgeFunctionAuth

## الخطوات
1. تشغيل `npx vitest run` لتنفيذ جميع الاختبارات
2. مراجعة النتائج والتأكد من نجاح جميع الاختبارات
3. في حالة وجود اختبارات فاشلة، تحليل السبب وإصلاحه

