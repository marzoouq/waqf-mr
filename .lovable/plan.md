
# خطة إصلاح المشاكل — الحالة النهائية

## ✅ جميع المهام مُكتملة

| المهمة | الحالة | ملاحظات |
|--------|--------|---------|
| 1. نقل تخصيصات العقود إلى RPC ذري | ✅ مُكتمل | `upsert_contract_allocations` RPC |
| 2. إخفاء حصة الناظر/الواقف من WaqifDashboard | ✅ مُكتمل | التسلسل المالي يعرض دخل/مصروفات/قابل للتوزيع فقط |
| 3. استخدام getSafeErrorMessage | ✅ مُكتمل | BeneficiarySettingsPage |
| 4. تحقق رقم الهوية وIBAN | ✅ مُكتمل | validation + maxLength في BeneficiaryFormDialog |
| 5. توحيد lastAutoTable typing | ✅ مُكتمل | `getLastAutoTableY` في pdfHelpers.ts |
| 6. إصلاح عرض الخصومات في DisclosurePage | ✅ مُكتمل | فصل الخصومات الإدارية عن احتياطي رقبة الوقف |

## إصلاحات إضافية من تقرير التدقيق

| الإصلاح | الحالة |
|---------|--------|
| WebAuthn token_hash — إنشاء جلسة server-side | ✅ مُكتمل |
| accounts RESTRICTIVE RLS policy | ✅ مُكتمل |
| beneficiaries — إزالة وصول الواقف | ✅ مُكتمل |
| PDF toast عند فشل الخطوط | ✅ مُكتمل |
| WebAuthn isEnabled من DB | ✅ مُكتمل |
| cron_check_late_payments حماية الدور | ✅ مُكتمل |
| DEFAULT_ROLE_PERMS مركزي | ✅ مُكتمل |
| FiscalYear type موحد | ✅ مُكتمل |
| DATABASE.md محدث | ✅ مُكتمل |
