

# خطة تحديث الاستيرادات لاستخدام Barrel Exports

## ملخص
تحديث الاستيرادات في ~25 ملف لاستخدام barrel exports بدلاً من المسارات المباشرة، مع إضافة تصديرات أنواع (types) مفقودة إلى ملفات barrel الموجودة.

**ملاحظة مهمة**: الاستيرادات الكسولة (`lazy(() => import(...))`) ستبقى كما هي لأنها تعتمد على المسارات المباشرة لتقسيم الكود (code splitting).

---

## المرحلة 1: إضافة تصديرات الأنواع المفقودة

إضافة تصديرات type إلى 4 ملفات barrel:

| ملف Barrel | الأنواع المطلوبة |
|---|---|
| `components/dashboard/index.ts` | `StatItem`, `KpiItem` |
| `components/invoices/index.ts` | `InvoicePreviewData` |
| `components/settings/index.ts` | `LandingPageContent` |
| `components/beneficiaries/index.ts` | `BeneficiaryFormData` |

---

## المرحلة 2: تحديث الاستيرادات في الملفات

### مجلد Dashboard (3 ملفات)
- **`AdminDashboard.tsx`**: دمج 7 استيرادات مباشرة → `from '@/components/dashboard'` (الـ 4 lazy تبقى)
- **`useAdminDashboardStats.ts`**: دمج 2 type imports → `from '@/components/dashboard'`
- **`DashboardStatsGrid.tsx`**: `YoYBadge` → `from '@/components/dashboard'`

### مجلد Invoices (6 ملفات)
- **`InvoicesPage.tsx`**: دمج 6 استيرادات → `from '@/components/invoices'`
- **`InvoicesViewPage.tsx`**: دمج 4 استيرادات → `from '@/components/invoices'`
- **`PaymentInvoicesTab.tsx`**: دمج 2 استيرادات → `from '@/components/invoices'`
- **`ExpenseAttachments.tsx`**: `InvoiceViewer` → `from '@/components/invoices'`
- **`usePaymentInvoicesTab.ts`** + **`useInvoicesPage.ts`** + **`useCreateInvoiceForm.ts`**: type imports → barrel

### مجلد Reports (2 ملفات)
- **`ReportsPage.tsx`**: دمج 5 استيرادات مباشرة → `from '@/components/reports'` (الـ 3 lazy تبقى)
- **`YearOverYearComparison.tsx`**: `YoYComparisonTable` → `from '@/components/reports'` (الـ lazy يبقى)

### مجلد Accounts (3 ملفات)
- **`AccountsPage.tsx`**: دمج 11 استيرادات → `from '@/components/accounts'`
- **`AccountsViewPage.tsx`**: دمج 2 استيرادات → `from '@/components/accounts'`
- **`BeneficiariesPage.tsx`**: `AdvanceRequestsTab` → `from '@/components/accounts'`

### مجلد Beneficiaries (4 ملفات)
- **`BeneficiariesPage.tsx`**: دمج 2 استيرادات → `from '@/components/beneficiaries'`
- **`MySharePage.tsx`**: `AdvanceRequestDialog` → `from '@/components/beneficiaries'`
- **`BeneficiaryAdvanceCard.tsx`**: `AdvanceRequestDialog` → `from '@/components/beneficiaries'`
- **`useBeneficiariesPage.ts`**: type import → barrel

### مجلد Properties (1 ملف)
- **`PropertiesPage.tsx`**: دمج 5 استيرادات → `from '@/components/properties'`

### مجلد Settings (7 ملفات)
- **`SettingsPage.tsx`**: دمج 6 استيرادات مباشرة → `from '@/components/settings'` (الـ 11 lazy تبقى)
- **`BeneficiarySettingsPage.tsx`**: دمج 3 استيرادات → `from '@/components/settings'`
- **`WaqfSettingsTab.tsx`**: `LogoManager` → `from '@/components/settings'`
- **`Index.tsx`** + **`LandingHero.tsx`** + **`LandingCTA.tsx`** + **`LandingFooter.tsx`** + **`LandingFeatures.tsx`**: type `LandingPageContent` → `from '@/components/settings'`

### مجلد Support (2 ملفات)
- **`SupportPage.tsx`**: دمج 3 استيرادات → `from '@/components/support'`
- **`SupportDashboardPage.tsx`**: دمج 6 استيرادات → `from '@/components/support'`

### مجلد Notifications (2 ملفات)
- **`MobileHeader.tsx`**: `NotificationBell` → `from '@/components/notifications'`
- **`DesktopTopBar.tsx`**: `NotificationBell` → `from '@/components/notifications'`

---

## المرحلة 3: التحقق
- تشغيل `npx tsc --noEmit` للتأكد من عدم وجود أخطاء
- تشغيل الاختبارات المتاحة

---

## ملفات لن تُحدّث (مبرّر)
- استيرادات `properties/units/` (مسار فرعي غير مشمول في barrel)
- جميع استيرادات `lazy(() => import(...))` — ضرورية لتقسيم الكود
- استيرادات داخلية ضمن نفس المجلد (مثل `InvoiceGridView` يستورد `InvoiceViewer` من نفس المجلد)

