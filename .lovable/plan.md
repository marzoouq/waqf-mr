

## فحص جنائي شامل: Radix Select داخل Dialog — كل الملفات المتأثرة

### المشكلة الجذرية
React 19 + Radix UI Select يتعارضان عند استخدام Portal داخل Dialog. يسبب خطأ `removeChild`/`insertBefore` on `Node`. الحل: استبدال Radix Select بـ `NativeSelect` داخل كل Dialog.

### الملفات التي تم إصلاحها سابقاً (4 ملفات) ✓
1. `ContractFormDialog.tsx`
2. `ExpenseFormDialog.tsx`
3. `BeneficiaryFormDialog.tsx`
4. `AccountsDialogs.tsx`

### الملفات التي لا تزال مصابة (6 ملفات) ✗

| # | الملف | عدد Select داخل Dialog | التفاصيل |
|---|-------|----------------------|----------|
| 1 | `PropertyUnitsDialog.tsx` | 5 | نوع الوحدة، الدور، الحالة، نوع الدفع × 2 |
| 2 | `IncomePage.tsx` | 1 | اختيار العقار في حوار إضافة الدخل (سطر 120-123) |
| 3 | `InvoicesPage.tsx` | 3 | نوع الفاتورة، العقار، العقد في حوار رفع فاتورة (سطر 263-281) |
| 4 | `UserManagementPage.tsx` | 1 | اختيار الدور في حوار إنشاء مستخدم (سطر 294-304) |
| 5 | `MessagesPage.tsx` | 1 | اختيار المستفيد في حوار محادثة جديدة (سطر 205-212) |
| 6 | `SupportPage.tsx` (beneficiary) | 1 | اختيار التصنيف في حوار طلب دعم (سطر 295-303) |
| 7 | `SupportDashboardPage.tsx` | 2 | التصنيف والأولوية في حوار تذكرة جديدة (سطر 781-799) |

**المجموع: 14 موقع Select داخل Dialog لم يُعالج بعد.**

### ملفات تستخدم Select خارج Dialog (آمنة — لا تحتاج تغيير)
- `AuditLogPage.tsx` — فلاتر في الصفحة مباشرة
- `FiscalYearSelector.tsx` — مكون مستقل
- `SettingsPage.tsx` — لا يحتوي Dialog
- `YearOverYearComparison.tsx` — بطاقة مستقلة
- `AccessLogTab.tsx` / `ArchiveLogTab.tsx` — فلاتر مباشرة
- `PaymentInvoicesTab.tsx` — فلاتر مباشرة
- `AccountsCollectionTable.tsx` — inline edit
- `BulkNotificationsTab.tsx` — tab مباشر
- `ZatcaSettingsTab.tsx` — tab مباشر
- `BeneficiarySettingsPage.tsx` — إعدادات مباشرة
- `SupportDashboardPage.tsx` (فلاتر الصفحة) — خارج Dialog

### خطة التنفيذ

**7 ملفات × استبدال imports + تحويل Select → NativeSelect:**

كل ملف:
1. إزالة import لـ `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`
2. إضافة import لـ `NativeSelect`
3. تحويل كل `<Select>` داخل `<DialogContent>` إلى `<NativeSelect options={[...]} />`

التحويل نمطي ومتكرر — نفس النمط المطبق في الملفات الأربعة السابقة.

