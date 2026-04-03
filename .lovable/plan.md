

# خطة التحسين الشاملة — التنفيذ

## المحور 1: تقسيم الهوكات الأربعة

### 1.1 `useInvoices.ts` (272 سطر) → ملفين
- **`useInvoiceFileUtils.ts`** (جديد ~100 سطر): نقل `FILE_SIGNATURES`, `WEBP_MARKER`, `validateFileSignature`, `uploadInvoiceFile`, `getInvoiceSignedUrl`, `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE`, `VALID_EXTENSIONS`
- **`useInvoices.ts`** (يبقى ~170 سطر): Types + CRUD + `useInvoicesByFiscalYear` + `useDeleteInvoice` + `useGenerateInvoicePdf`
- تحديث imports في `useInvoicesPage.ts`

### 1.2 `useUserManagement.ts` (265 سطر) → 3 ملفات
- **`useUserManagementData.ts`** (جديد ~80 سطر): `callAdminApi`, `ManagedUser` type, استعلامات (`admin-users`, `registration-enabled`, `orphaned-beneficiaries`, `unlinked-beneficiaries`)
- **`useUserManagementMutations.ts`** (جديد ~100 سطر): `createUser`, `confirmEmail`, `updateEmail`, `updatePassword`, `setRole`, `deleteUser`, `linkBeneficiary`, `toggleRegistration`
- **`useUserManagement.ts`** (يبقى ~85 سطر): منظّم يجمع Data + Mutations + حالة UI (dialogs, filters, pagination)

### 1.3 `useSupportTickets.ts` (263 سطر) → 3 ملفات
- **`useSupportTicketMutations.ts`** (جديد ~90 سطر): `useCreateTicket`, `useUpdateTicketStatus`, `useAddTicketReply`, `useRateTicket`
- **`useSupportAnalytics.ts`** (جديد ~55 سطر): `useSupportStats`, `useSupportAnalytics`, `SupportAnalyticsData`, `fetchTicketsForExport`
- **`useSupportTickets.ts`** (يبقى ~120 سطر): Types + `useSupportTickets` + `useTicketReplies` + `useClientErrors` + re-exports من الملفين الآخرين
- تحديث imports في `useSupportDashboardPage.ts` + ملفات الاختبار

### 1.4 `useAccountsActions.ts` (275 سطر) → ملفين
- **`useAccountsSettings.ts`** (جديد ~80 سطر): إدارة النسب (`adminPercent`, `waqifPercent`, `fiscalYear`, `zakatAmount`, `waqfCorpusManual`, إلخ) + `saveSetting` + `handleAdminPercentChange` + `handleWaqifPercentChange` + `handleFiscalYearChange` + useEffect لتحميل الإعدادات
- **`useAccountsActions.ts`** (يبقى ~120 سطر): `handleCreateAccount`, `handleCloseYear`, `handleExportPdf`, `buildAccountData` — يستورد settings من الهوك الجديد

---

## المحور 2: استخراج استعلامات Supabase من 6 مكونات

### 2.1 `AccessLogTab.tsx` → `useAccessLogTab.ts`
استخراج 3 استعلامات (`access_log`, `access_log_failed_today`, `access_log_unauthorized_today`) + الأنواع + `ITEMS_PER_PAGE` إلى هوك جديد في `src/hooks/data/useAccessLogTab.ts`

### 2.2 `ArchiveLogTab.tsx` → `useArchiveLog.ts`
استخراج استعلام `access_log_archive` + الأنواع إلى `src/hooks/data/useArchiveLog.ts`

### 2.3 `DistributionHistory.tsx` → `useDistributionHistory.ts`
استخراج استعلام توزيعات المستفيد إلى `src/hooks/data/useDistributionHistory.ts`

### 2.4 `ExpenseBudgetBar.tsx` → `useExpenseBudgets.ts`
استخراج استعلام + mutation الميزانيات إلى `src/hooks/data/useExpenseBudgets.ts`

### 2.5 `BulkMessagingTab.tsx` → `useBulkMessaging.ts`
استخراج استعلام المستفيدين + منطق الإرسال إلى `src/hooks/data/useBulkMessaging.ts`

### 2.6 `ZatcaOperationsLog.tsx` → `useZatcaOperationLog.ts`
استخراج استعلام سجل العمليات إلى `src/hooks/data/useZatcaOperationLog.ts`

---

## المحور 3: تأجيل react-markdown

تحويل `import ReactMarkdown from 'react-markdown'` إلى `React.lazy` في:
- `src/pages/beneficiary/BylawsViewPage.tsx`
- `src/components/ai/AiAssistant.tsx`
- `src/components/bylaws/SortableBylawItem.tsx`

مع إضافة `<Suspense fallback>` حول كل استخدام.

---

## الملفات المتأثرة

| العملية | الملفات |
|---------|---------|
| إنشاء جديد | 10 هوكات: `useInvoiceFileUtils`, `useUserManagementData`, `useUserManagementMutations`, `useSupportTicketMutations`, `useSupportAnalytics`, `useAccountsSettings`, `useAccessLogTab`, `useArchiveLog`, `useDistributionHistory`, `useExpenseBudgets`, `useBulkMessaging`, `useZatcaOperationLog` |
| تعديل (تقليص) | 4 هوكات أصلية + 6 مكونات UI + 3 ملفات react-markdown |
| تحديث imports | `useInvoicesPage.ts`, `useSupportDashboardPage.ts`, `ExpensesPage.tsx` |

