

# تقرير الفحص الجنائي الهجين — الملفات الكبيرة والتقسيم والتنظيم

## المنهجية
فحص شامل لكل ملفات `src/` (692 ملف) لتحديد الملفات التي تتجاوز 200 سطر، مع تقييم كل ملف: هل يحتاج تقسيم؟ هل يحتاج تنظيم؟ أم أنه مقبول بحجمه الحالي؟

---

## 1. الملفات التي تتجاوز 200 سطر (مرتبة تنازلياً)

| # | الملف | الأسطر | الحالة |
|---|-------|--------|--------|
| 1 | `pages/dashboard/MessagesPage.tsx` | **293** | يحتاج تقسيم |
| 2 | `pages/dashboard/AdminDashboard.tsx` | **282** | يحتاج تقسيم |
| 3 | `pages/dashboard/PropertiesPage.tsx` | **279** | يحتاج تقسيم |
| 4 | `hooks/data/useInvoices.ts` | **273** | يحتاج تقسيم |
| 5 | `hooks/data/useMessaging.ts` | **264** | يحتاج تقسيم |
| 6 | `hooks/data/useSupportTickets.ts` | **263** | يحتاج تقسيم |
| 7 | `pages/dashboard/ReportsPage.tsx` | **262** | يحتاج تقسيم |
| 8 | `hooks/data/useNotifications.ts` | **255** | يحتاج تقسيم |
| 9 | `pages/dashboard/AccountsPage.tsx` | **252** | يحتاج تقسيم |
| 10 | `contexts/AuthContext.tsx` | **251** | ⛔ محمي — لا يُعدّل |
| 11 | `pages/dashboard/ContractsPage.tsx` | **251** | يحتاج تقسيم |
| 12 | `hooks/data/useCrudFactory.ts` | **247** | مقبول (مصنع عام) |
| 13 | `pages/dashboard/InvoicesPage.tsx` | **246** | يحتاج تقسيم |
| 14 | `hooks/page/useInvoicesPage.ts` | **241** | يحتاج تقسيم |
| 15 | `hooks/page/useContractsPage.ts` | **236** | يحتاج تقسيم |
| 16 | `components/DashboardLayout.tsx` | **235** | مقبول (تخطيط رئيسي) |
| 17 | `components/reports/MonthlyPerformanceReport.tsx` | **224** | يحتاج تقسيم |
| 18 | `pages/dashboard/ExpensesPage.tsx` | **222** | يحتاج تقسيم |
| 19 | `components/reports/YearOverYearComparison.tsx` | **220** | يحتاج تقسيم |
| 20 | `components/reports/CashFlowReport.tsx` | **218** | يحتاج تقسيم |
| 21 | `components/settings/BulkMessagingTab.tsx` | **215** | يحتاج تقسيم |
| 22 | `hooks/data/useAnnualReport.ts` | **208** | يحتاج تقسيم |
| 23 | `pages/dashboard/AnnualReportPage.tsx` | **207** | يحتاج تقسيم |
| 24 | `pages/dashboard/SystemDiagnosticsPage.tsx` | **204** | مقبول (صفحة تشخيص) |
| 25 | `pages/dashboard/AuditLogPage.tsx` | **200** | حدّي — مقبول |

---

## 2. الملفات التي تحتاج تقسيم (أولوية عالية — 18 ملف)

### المجموعة أ: صفحات ثقيلة (UI + منطق مختلط)

| الملف | السبب | التقسيم المقترح |
|-------|-------|----------------|
| `MessagesPage.tsx` (293) | واجهة محادثات + منطق اختيار + تمرير | استخراج `MessageList`, `ConversationSidebar`, `MessageInput` |
| `AdminDashboard.tsx` (282) | تجميع widgets كثيرة | استخراج الأقسام إلى مكونات فرعية (alerts, stats, charts) |
| `PropertiesPage.tsx` (279) | عرض + تعديل + حسابات مالية | استخراج `PropertyCard`, `PropertyFilters`, hook `usePropertiesPageLogic` |
| `ReportsPage.tsx` (262) | 7+ تقارير في ملف واحد | كل تقرير مكون مستقل (معظمها مفصول أصلاً — يبقى تنظيف orchestrator) |
| `ContractsPage.tsx` (251) | فلترة + جداول + accordions | استخراج `ContractsFilters`, `ContractsTable` |
| `InvoicesPage.tsx` (246) | نماذج + جداول + معاينة | استخراج `InvoicesFilters`, `InvoicesTable` |
| `AccountsPage.tsx` (252) | عرض + تعديل + قفل | استخراج `AccountsTable`, `AccountActions` |
| `ExpensesPage.tsx` (222) | نموذج + جدول + فلاتر | استخراج `ExpensesTable`, `ExpenseFormDialog` |

### المجموعة ب: Hooks ثقيلة (منطق + بيانات)

| الملف | السبب | التقسيم المقترح |
|-------|-------|----------------|
| `useInvoices.ts` (273) | CRUD + URL signing + helpers | فصل `useInvoiceHelpers` (signing, PDF) عن CRUD |
| `useMessaging.ts` (264) | محادثات + رسائل + realtime | فصل `useConversations` عن `useMessages` في ملفات مستقلة |
| `useSupportTickets.ts` (263) | tickets + replies + admin | فصل `useTicketReplies` عن `useSupportTickets` |
| `useNotifications.ts` (255) | infinite query + mutations + realtime | فصل `useNotificationActions` عن `useNotificationsList` |
| `useInvoicesPage.ts` (241) | state + form + handlers | فصل `useInvoiceForm` عن `useInvoicesPageState` |
| `useContractsPage.ts` (236) | filters + stats + handlers | فصل `useContractStats` عن handlers |
| `useAnnualReport.ts` (208) | CRUD + publish + comparison | فصل `useReportPublish` عن CRUD |

### المجموعة ج: تقارير (عرض + حسابات)

| الملف | السبب | التقسيم المقترح |
|-------|-------|----------------|
| `MonthlyPerformanceReport.tsx` (224) | جداول + حسابات + رسوم | استخراج الحسابات إلى hook، الجداول إلى مكونات |
| `YearOverYearComparison.tsx` (220) | مقارنة + رسوم + تصدير | استخراج `YoYSummaryCards` و `YoYExport` |
| `CashFlowReport.tsx` (218) | جداول + حسابات + رسم | استخراج حسابات التدفق إلى hook |
| `BulkMessagingTab.tsx` (215) | نموذج + اختيار + إرسال | استخراج `RecipientSelector` و `MessageComposer` |

---

## 3. الملفات التي تحتاج تنظيم (بدون تقسيم)

| الملف | المشكلة | الإصلاح |
|-------|---------|---------|
| `DashboardLayout.tsx` (235) | imports كثيرة + lazy loading مختلط | ترتيب imports وتجميع المكونات المتأخرة |
| `useCrudFactory.ts` (247) | مصنع عام — الحجم مبرر لكن الأنواع مضمّنة | استخراج أنواع `CrudFactory` إلى ملف types |
| `useComputedFinancials.ts` (184) | حسابات مالية معقدة — الحجم مبرر | إضافة تعليقات أقسام داخلية |
| `SettingsPage.tsx` (131) | 18 أيقونة مستوردة في سطر واحد | تنظيم imports |

---

## 4. الملفات المقبولة بحجمها الحالي (لا تحتاج تغيير)

| الملف | السبب |
|-------|-------|
| `AuthContext.tsx` (251) | ⛔ محمي بتعليمات المشروع |
| `ProtectedRoute.tsx` (143) | ⛔ محمي |
| `SystemDiagnosticsPage.tsx` (204) | صفحة تشخيص ذاتية — التقسيم يزيد التعقيد |
| `AuditLogPage.tsx` (200) | حدّي ومتماسك |
| `ErrorBoundary.tsx` (160) | Class component — مقبول |

---

## 5. خطة التنفيذ المقترحة (مراحل)

### المرحلة 1 — الأولوية القصوى (الأكبر حجماً)
1. تقسيم `MessagesPage.tsx` → 3 مكونات
2. تقسيم `useInvoices.ts` → CRUD + helpers
3. تقسيم `useMessaging.ts` → conversations + messages
4. تقسيم `useNotifications.ts` → list + actions

### المرحلة 2 — الصفحات الثقيلة
5. تقسيم `AdminDashboard.tsx` → أقسام فرعية
6. تقسيم `PropertiesPage.tsx` → card + filters
7. تقسيم `ContractsPage.tsx` → filters + table
8. تقسيم `InvoicesPage.tsx` → filters + table

### المرحلة 3 — التقارير والإعدادات
9. تقسيم تقارير (CashFlow, Monthly, YoY) → hooks + مكونات
10. تقسيم `BulkMessagingTab.tsx` → selector + composer

### المرحلة 4 — تنظيف
11. تنظيم imports في `DashboardLayout.tsx` و `SettingsPage.tsx`
12. استخراج أنواع `useCrudFactory` إلى ملف مستقل

---

## ملاحظات أمنية
- لن تُمَس الملفات المحمية (`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`)
- لن تُمَس ملفات النظام (`client.ts`, `types.ts`, `config.toml`, `.env`)
- التقسيم بنيوي فقط — لا تغيير في المنطق أو السلوك

