# خطة إكمال مراجعة المعمارية — البنود المتبقية

## ✅ مُحقَّق من الجلسة السابقة (8 بنود)
#1 sonner→uiNotify · #3 useQueryClient · #4 SupportPageGuard · #6 fmtInt · #7 isClosed (15/16) · #9 VAT_RATE · #12 varianceReport · #13 fmtDateHijri

## 🔍 إعادة فحص اليوم كشفت
- `sonner` المباشر: **0** في كود الإنتاج (فقط lib/notify + tests + ui/sonner.tsx) — نظيف ✅
- `isClosed` محلي متبقي: **ملف واحد فقط** (`useAccountsPage.ts`)
- `toLocaleString('ar-SA')`: **15 موقعاً** (لا 21 — بعضها كان في الملفات المُعدَّلة)
- مكونات > 180 سطر: **13 ملف** (تغيرت القائمة — بعض الإصلاحات السابقة زادت الأسطر)
- god files: `aggregatedAnnualReport` نزل إلى 152، `diagnostics` مُقسَّم بالفعل ✅ — يبقى `useExpensesPage` (194) و `useIncomePage` (189)

---

## البنود المتبقية للتنفيذ

### P0 — إكمال ما بدأناه
**A.** نقل `isClosed` المتبقي في `useAccountsPage.ts` لاستخدام `useFiscalYear().isClosed` (سطر واحد).

### P1 — توحيد التنسيق
**B.** إنشاء `fmtDateTime(date, opts?)` في `src/utils/format/format.ts` ونشره عبر **15 موقعاً**:
- pages: `SystemDiagnosticsPage`
- components: `EmailMonitorPrimitives`, `ZatcaOperationsLog`, `ZatcaConnectionStatus`, `AuditLogTable`, `AuditLogStats`, `ArchiveLogTab`, `AccessLogTab`, `TicketDetailDialog`, `SupportErrorsTab`, `SystemSettingsTab`
- hooks: `useSystemDiagnostics`, `useDistribute`, `useSupportDashboardPage`
- تصدير عبر `utils/format/index.ts` + اختبار وحدة

### P2 — نقل ملفات utils من components/
**C.** نقل 3 ملفات (الـ4 الأصلية أصبحت 3 لأن `accrualUtils.ts` غير موجود):
- `components/accounts/closeYearChecklist.utils.ts` → `utils/accounts/`
- `components/invoices/invoiceTemplateUtils.ts` → `utils/invoices/`
- `components/properties/units/helpers.ts` → `utils/properties/`
- تحديث barrel `components/accounts/index.ts` (يستخدم `export *`) والمستهلكين

**الإبقاء كما هي (مبرَّر):**
- `auditEventConfig.ts` — يحوي أيقونات lucide → UI config
- `notificationConstants.ts` — أيقونات + مفصول جزئياً مسبقاً
- `overdueTypes.ts` — types مرافقة لـ3 مكونات شقيقة

### P3 — تفكيك god files (تبقى 2 فقط)
**D.** تقسيم `useExpensesPage.ts` (194 سطر) إلى:
- `useExpensesData.ts` (queries)
- `useExpensesActions.ts` (mutations)
- `useExpensesPage.ts` (تنسيق)

**E.** تقسيم `useIncomePage.ts` (189 سطر) بنفس النمط.

### P3 — نقل حزمة User Management
**F.** نقل المجموعة الرباعية من `hooks/auth/role/` إلى `hooks/data/users/`:
- `useUserManagementData.ts`, `useUserManagementMutations.ts`, `useUserManagementForms.ts`, `useUserManagement.ts`
- `useRoleRedirect.ts` يبقى في `hooks/auth/role/` (مرتبط بالدور فعلياً)
- تحديث الاستيرادات في `UserManagementPage.tsx` + أي مستهلك آخر

### P0 — تقسيم 13 مكوّن > 180 سطر (مؤجَّل لخطة منفصلة)
**G.** بنود مستقلة (كل مكوّن يحتاج تحليل خاص):
```
196 AnnualReportPage.tsx        186 InvoiceGridView.tsx
190 DistributionsPage.tsx       186 AdvanceRequestDialog.tsx
187 ReportsPage.tsx             185 ZakatEstimationReport.tsx
183 AccountsPage.tsx            182 MySharePage.tsx
182 ZatcaFormCards.tsx          182 DistributeDialog.tsx
181 CreateInvoiceFromTemplate.tsx  181 AccountsSummaryCards.tsx
```
**التوصية:** عدم تنفيذ G في هذه الجلسة — كل ملف يحتاج خطة استخراج subcomponents مدروسة. أُنشئ خطة لاحقة عند الطلب.

### مؤجَّل: #2 useCrudMutations silent-by-default
يلمس ~30 callsite. خطر عالٍ. يحتاج جلسة مستقلة مع اختبار شامل.

---

## ترتيب التنفيذ المقترح

| ترتيب | البند | تكلفة | خطر |
|------|------|------|-----|
| 1 | A (isClosed المتبقي) | تافه | لا شيء |
| 2 | B (fmtDateTime × 15) | متوسط | منخفض |
| 3 | C (نقل 3 utils) | منخفض | منخفض |
| 4 | F (نقل user mgmt × 4) | متوسط | منخفض |
| 5 | D + E (تفكيك hooks) | متوسط | متوسط |

**يُستثنى من هذه الخطة:** G (تقسيم 13 مكوّن) و #2 (CRUD silent) — كل منهما يحتاج خطة مستقلة.

---

## معايير التحقق بعد التنفيذ
- `rg "status === 'closed'" src/hooks` → 0
- `rg "toLocaleString\(['\"]ar-SA" src/ | grep -v utils/` → 0
- `find src/components -name "*utils*.ts" -o -name "helpers.ts"` → 0 (عدا UI-coupled)
- `wc -l src/hooks/page/admin/financial/use{Expenses,Income}Page.ts` → < 120 لكل ملف
- البناء يمر بدون أخطاء + اختبارات `fmtDateTime` تنجح
