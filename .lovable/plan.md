

# خطة التنفيذ — تنظيف معماري شامل (6 خطوات)

## الخطوة 1: نقل مكونات UI من `pages/` إلى `components/`

### Carryforward (3 ملفات)
- نقل `src/pages/beneficiary/carryforward/` → `src/components/carryforward/`
- تحديث imports في `CarryforwardHistoryPage.tsx`:
  - `'./carryforward/...'` → `'@/components/carryforward/...'`

### Notifications (4 ملفات)
- نقل `src/pages/beneficiary/notifications/` → `src/components/notifications/` (دمج مع المجلد الموجود)
- تحديث imports في `NotificationsPage.tsx`:
  - `'./notifications/...'` → `'@/components/notifications/...'`
- تحديث `src/components/notifications/index.ts` لتصدير المكونات الجديدة

**الملفات المتأثرة**: 9 ملفات (7 نقل + 2 تحديث imports)

---

## الخطوة 2: إصلاح `useGreeting` — نقله قبل early returns

في `BeneficiaryDashboard.tsx`:
- دمج `useGreeting()` داخل `useBeneficiaryDashboardPage` hook (إضافة `greetingData` للقيم المُرجعة)
- حذف استدعاء `useGreeting()` من السطر 72 وتعليق `eslint-disable`
- حذف import `useGreeting` من الصفحة

**الملفات المتأثرة**: 2 (`BeneficiaryDashboard.tsx` + `useBeneficiaryDashboardPage.ts`)

---

## الخطوة 3: فصل `AuditLogHelpers.tsx`

- إنشاء `src/utils/format/auditLabels.ts` ← نقل `operationColor`, `formatValue`, `getFieldLabel`, `FIELD_LABELS`
- إنشاء `src/components/audit/DataDiff.tsx` ← نقل مكوّن `DataDiff` مع import من الملف الجديد
- حذف `AuditLogHelpers.tsx` الأصلي
- تحديث `src/components/audit/index.ts` وأي ملفات تستورد من `AuditLogHelpers`

**الملفات المتأثرة**: ~5 ملفات

---

## الخطوة 4: إزالة منطق العرض من `useBeneficiarySettingsPage`

- نقل مصفوفة `tabItems` (مع أيقونات Lucide و `createElement`) إلى `BeneficiarySettingsPage.tsx` مباشرة
- إبقاء Hook للبيانات فقط: `user`, `currentBeneficiary`, `maskedId`, `benLoading`, `benError`, `handleRetry`
- حذف imports: `TabItem`, `createElement`, أيقونات Lucide من الـ hook

**الملفات المتأثرة**: 2 (`useBeneficiarySettingsPage.ts` + `BeneficiarySettingsPage.tsx`)

---

## الخطوة 5: استخراج `useInstallAppPage` hook

- إنشاء `src/hooks/page/useInstallAppPage.ts` ← نقل:
  - `deferredPrompt` state + `beforeinstallprompt` listener
  - `isInstalled` state + `appinstalled` listener
  - `isIOS` detection
  - `handleInstall` callback
- تبسيط `InstallApp.tsx` ليصبح UI فقط

**الملفات المتأثرة**: 2 (جديد + تحديث)

---

## الخطوة 6: توحيد `ComplianceResult` types

- إنشاء `src/types/zatca.ts` ← نقل `ComplianceResult` و `ComplianceMessage`
- تحديث imports في:
  - `ZatcaManagementPage.tsx` — حذف التعريف المحلي + import من `@/types/zatca`
  - `ZatcaComplianceDialog.tsx` — حذف التعريف المكرر + import من `@/types/zatca`

**الملفات المتأثرة**: 3 (جديد + 2 تحديث)

---

## ملخص

| الخطوة | الملفات | الخطر |
|--------|---------|-------|
| 1. نقل مكونات UI | 9 | منخفض |
| 2. إصلاح useGreeting | 2 | منخفض |
| 3. فصل AuditLogHelpers | 5 | منخفض |
| 4. تنظيف Settings hook | 2 | منخفض |
| 5. استخراج InstallApp hook | 2 | منخفض |
| 6. توحيد ComplianceResult | 3 | منخفض |
| **المجموع** | **~23 ملف** | **صفر تغيير سلوكي** |

كل الخطوات إعادة تنظيم بحتة — لا تغيير في السلوك أو الواجهة.

