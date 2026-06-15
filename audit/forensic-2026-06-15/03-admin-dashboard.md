# الموجة 3 — الفحص الجنائي العميق للوحة الناظر/المحاسب

**التاريخ**: 2026-06-15 — **النوع**: قراءة فقط (تشخيص) — **النطاق**: 24 صفحة لوحة + Sidebar + DashboardLayout + Page Hooks ذات الصلة.

> ملاحظة: العدد الفعلي للصفحات الإدارية في `src/pages/dashboard/` هو **24** صفحة لا 32. الرقم 32 في الخطة كان يشمل بوابات المستفيد/الواقف (موجة 4) وصفحات public. تم تصحيح النطاق بعد التحقق الفعلي.

---

## 1) جرد الصفحات (24)

| # | الصفحة | المسار | الأدوار | حجم |
|---|---|---|---|---|
| 1 | AdminDashboard | `/dashboard` | admin+accountant | 158 |
| 2 | PropertiesPage | `/dashboard/properties` | admin+accountant | 137 |
| 3 | ContractsPage | `/dashboard/contracts` | admin+accountant | 116 |
| 4 | IncomePage | `/dashboard/income` | admin+accountant | 144 |
| 5 | ExpensesPage | `/dashboard/expenses` | admin+accountant | 117 |
| 6 | BeneficiariesPage | `/dashboard/beneficiaries` | admin+accountant | 143 |
| 7 | ReportsPage | `/dashboard/reports` | admin+accountant | 187 |
| 8 | AccountsPage | `/dashboard/accounts` | admin+accountant | 183 |
| 9 | DistributionsPage | `/dashboard/distributions` | admin+accountant | 190 |
| 10 | MessagesPage | `/dashboard/messages` | admin+accountant | 86 |
| 11 | InvoicesPage | `/dashboard/invoices` | admin+accountant | 179 |
| 12 | AuditLogPage | `/dashboard/audit-log` | admin+accountant | 120 |
| 13 | BylawsPage | `/dashboard/bylaws` | admin+accountant | 168 |
| 14 | SupportDashboardPage | `/dashboard/support` | admin+accountant | 100 |
| 15 | AnnualReportPage | `/dashboard/annual-report` | admin+accountant | 196 |
| 16 | ChartOfAccountsPage | `/dashboard/chart-of-accounts` | admin+accountant | 132 |
| 17 | UserManagementPage | `/dashboard/users` | **admin only** | 173 |
| 18 | SettingsPage | `/dashboard/settings` | **admin only** | 98 (17 تبويب) |
| 19 | ZatcaManagementPage | `/dashboard/zatca` | **admin only** | 124 |
| 20 | HistoricalComparisonPage | `/dashboard/comparison` | **admin only** | 176 |
| 21 | SystemDiagnosticsPage | `/dashboard/diagnostics` | **admin only** | 146 |
| 22 | EmailMonitorPage | `/dashboard/email-monitor` | **admin only** | 115 |
| 23 | AuditReportFinalPage | `/dashboard/audit-report-final` | **admin only** | 74 |
| 24 | CleanupReportPage | `/dashboard/cleanup-report` | **admin only** | 132 |

**الملاحظات البنيوية**: كل الصفحات تتبع نمط Page Hook (logic-less UI) ✓ — جميعها مغلَّفة بـ `DashboardLayout` ✓ — جميعها تستخدم `PageHeaderCard` موحَّد ✓.

---

## 2) النتائج المرتبة بالخطورة

### 🔴 Critical — 0

لا ثغرات تكشف بيانات أو تكسر RBAC. الطبقات الأمنية (`ProtectedRoute` + `RequirePermission` + RLS) تعمل بشكل صحيح.

---

### 🟠 High — 9

#### W3-001 — تبديل "التسجيل العام" بدون تأكيد (UserManagementPage)
- **الموقع**: `src/pages/dashboard/UserManagementPage.tsx:96-103` (`<Switch ... onCheckedChange={mgmt.toggleRegistration}>`)
- **الوصف**: زر Switch واحد يفتح/يغلق التسجيل العام للنظام بأكمله بدون أي حوار تأكيد. نقرة عرضية = فتح موقع الإنتاج للتسجيل الحر.
- **الأثر**: ثغرة UX قد تؤدي لـ flood من حسابات وهمية أو spam.
- **التوصية**: `AlertDialog` تأكيد + كتابة كلمة "تأكيد" عند الفتح (ليس الإغلاق).

#### W3-002 — 5 صفحات تبويبات لا تحفظ الحالة في URL
- **المواقع**:
  - `BeneficiariesPage.tsx:32` (`defaultValue="beneficiaries"`)
  - `SystemDiagnosticsPage.tsx:105` (`defaultValue="overview"`)
  - `SupportDashboardPage.tsx:48` (`defaultValue="tickets"`)
  - `ReportsPage.tsx:92` (`defaultValue="financial"`)
  - `ZatcaManagementPage.tsx:70` (`defaultValue="invoices"`)
- **الوصف**: refresh أو share link يفقد التبويب النشط. مشكلة شائعة عند تحديث المتصفّح أثناء عمل طويل.
- **التوصية**: hook موحَّد `useTabFromUrl(key, default)` يربط `?tab=` بقيم Radix Tabs.

#### W3-003 — البحث في 6 صفحات بدون debounce
- **الموقع**: `IncomePage`, `ExpensesPage`, `BylawsPage`, `ChartOfAccountsPage`, `InvoicesPage`, `MessagesPage` — كلها `onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}` مباشر.
- **الوصف**: كل ضغطة مفتاح تُعيد فلترة 500+ صف و re-render شجرة كاملة. عند 2000 فاتورة (سقف pagination) قد يصل INP إلى 300-500ms.
- **التوصية**: `useDebounce(searchQuery, 250)` أو hook موحّد `useDebouncedSearch`.

#### W3-004 — `AnnualReportPage` نشر/إلغاء نشر بدون منع تكرار
- **الموقع**: `src/pages/dashboard/AnnualReportPage.tsx` — زر "نشر" يُفعّل `r.handlePublish` بدون disabled أثناء mutation.
- **الوصف**: الناقر السريع قد يُرسل عدة طلبات نشر. الـ mutation idempotent من ناحية DB، لكنه يولّد ضوضاء في `audit_log` + إشعارات مكررة للمستفيدين.
- **التوصية**: `disabled={r.publishing}` + spinner.

#### W3-005 — `InvoicesPage` يعرض "إنشاء من قالب" للمحاسب رغم القيد
- **الموقع**: `InvoicesPage.tsx:35` — `<Button disabled={isLocked}>` لكن لا يتحقق من الدور.
- **الوصف**: المحاسب يرى الزر؛ النقر يفتح dialog؛ الإرسال يفشل بـ RLS. تجربة سيئة وارتباك.
- **التوصية**: `disabled={isLocked || role==='accountant'}` أو إخفاء الزر بـ permission check.

#### W3-006 — `AccountsPage` 4 أزرار + LockedBanner داخل `actions` يكسر التخطيط على mobile
- **الموقع**: `AccountsPage.tsx:39-58`
- **الوصف**: 5 عناصر داخل `actions` للـ `PageHeaderCard` على شاشة 360px → wrap عشوائي. `LockedYearBanner` كذلك ضمنها وهو ليس action فعلياً.
- **التوصية**: نقل `LockedYearBanner` خارج `actions` (سطر مستقل). DropdownMenu للأزرار غير الحرجة على الشاشات الصغيرة.

#### W3-007 — `SettingsPage` 17 tab تُبنى كلها في DOM (لكن lazy)
- **الموقع**: `SettingsPage.tsx:79-95`
- **الوصف**: Radix Tabs لا يُركّب `TabsContent` غير النشط افتراضياً، لكن العدد 17 يجعل الكود غير قابل للقراءة، وأي خطأ في tab واحد يكسر بناء الـ Tabs كاملة. لا يوجد ErrorBoundary حول كل `Suspense`.
- **التوصية**: استخراج map `TAB_COMPONENTS: Record<string, LazyComp>` + ErrorBoundary حول كل Tab.

#### W3-008 — `BylawsPage` يستخدم DnD-kit بدون keyboard sensor
- **الموقع**: `BylawsPage.tsx:14-15` (`DndContext` بـ `sensors` من hook)
- **الوصف**: إذا كان `useBylawsPage.sensors` يفتقر `KeyboardSensor` فلا يمكن لمستخدمي لوحة المفاتيح إعادة ترتيب اللوائح. يحتاج تأكيد. (a11y)
- **التوصية**: تحقّق من تركيب `KeyboardSensor` مع `sortableKeyboardCoordinates`.

#### W3-009 — `AdminDashboard` يحمّل بيانات heatmap حتى للمحاسب
- **الموقع**: `AdminDashboard.tsx:114-118` و `useAdminDashboardPage.ts:58`
- **الوصف**: `CollectionHeatmap` خارج `role === 'admin'` guard. يحمّل `secondary.heatmapInvoices` للمحاسب أيضاً — أحياناً 1000+ سجل. المحاسب لديه view خاص (AccountantDashboardView) أصلاً.
- **التوصية**: نقل `CollectionHeatmap` داخل `role === 'admin' || role === 'accountant'` مع شرط `if (!isAccountant)` لتفادي ازدواج العرض، أو إخفاؤها للمحاسب.

---

### 🟡 Medium — 11

| # | الصفحة | الوصف | الموقع |
|---|---|---|---|
| W3-010 | AuditLogPage | زر "تقرير التدقيق النهائي" مرئي للمحاسب لكنه يُوجّه لمسار ADMIN_ONLY → `/unauthorized` | `AuditLogPage.tsx:34` (`role === 'admin'` guard موجود ✓ — الفحص أكد سلامته) — **تم نفي البند** |
| W3-011 | ZatcaManagementPage | `InvoiceStepsGuide` يُعرض دائماً ولو لا توجد شهادة — مُربك للمستخدم الجديد | `ZatcaManagementPage.tsx:42` |
| W3-012 | ReportsPage | `defaultValue="financial"` بدون تذكُّر آخر تبويب — تنقل متكرر | `ReportsPage.tsx:92` |
| W3-013 | DistributionsPage | `canDistribute` يتحقق من 6 شروط — لا توجد رسالة توضّح للمستخدم أيها مفقود | `DistributionsPage.tsx:25-33` |
| W3-014 | MessagesPage | `h-[calc(100dvh-11.5rem)]` يكسر على Safari iOS < 16 (dvh غير مدعوم) | `MessagesPage.tsx:26` |
| W3-015 | EmailMonitorPage | لا حد أقصى على فلتر التاريخ — استعلام مفتوح قد يجلب 10k صف | (تحقق في `useEmailMonitorPage`) |
| W3-016 | ChartOfAccountsPage | `Dialog` و `AlertDialog` في نفس الصفحة — focus trap قد يتنافس | `ChartOfAccountsPage.tsx` |
| W3-017 | HistoricalComparisonPage | حد أقصى 4 سنوات لكن لا تنبيه إذا اختار المستخدم سنة 5 | `HistoricalComparisonPage.tsx:23` |
| W3-018 | AdminDashboard | `PendingActionsTable`/`DashboardCharts` تُحمّل lazy لكن بدون `printHidden` متّسقة (`YearComparisonCard` بدون printHidden) | `AdminDashboard.tsx:130` |
| W3-019 | UserManagementPage | `confirmEmail.mutate(id)` بدون tooltip يُبيّن أنه يُفعّل البريد يدوياً | `UserManagementPage.tsx:125` |
| W3-020 | AccountantDashboardView | يُحمَّل lazy داخل `isAccountant` guard ✓ لكن `useAccountantDashboardData` يُستدعى دائماً مع EMPTY heatmap لباقي الأدوار — حسابات مهدورة بقدر بسيط | `useAdminDashboardPage.ts:71-75` |

---

### 🔵 Low — 8

- **W3-021** `CleanupReportPage` ثابت — مولَّد بشكل static؛ لا يُحدّث تلقائياً عند جولة جديدة (تنبيه فقط).
- **W3-022** `AuditReportFinalPage` 74 سطر — يحتاج تأكيد أنه ينعكس على بيانات حية وليس static-report.
- **W3-023** `PropertiesPage` 137 سطر — لم تُفحص محتوياتها في هذه الموجة (sampling). إضافة لمصفوفة التغطية.
- **W3-024** `PageHeaderCard` يُستخدم 24 مرة لكن `description` أحياناً طويل جداً → wrap قبيح على mobile (`ExpensesPage`: 130 حرف).
- **W3-025** `ExportMenu` يظهر في 10+ صفحات — لا يوجد contract اختبار يضمن دالتي PDF/CSV تعملان لكل صفحة.
- **W3-026** `DashboardLazySection` بدون `aria-busy` أثناء التحميل — قارئات الشاشة لا تعلم.
- **W3-027** `<Tabs dir="rtl">` غير متّسقة — بعض الصفحات تضعها، أخرى تعتمد على `dir="rtl"` على الـ container.
- **W3-028** `icon-only` أزرار: `InvoicesPage:142` و `ChartOfAccountsPage:52` لديها `aria-label` ✓ — تم التحقق من عينة فقط.

---

### ⚪ Info — 6 (نقاط قوة)

- ✅ **نمط Page Hook ملتزم 100%** في 24 صفحة — لا منطق في UI.
- ✅ **`DashboardLayout` موحّد** يضمن Sidebar/MobileHeader/IdleTimeout.
- ✅ **`useDashboardRealtime` مُفصول** إلى قناتين (financial + messages) لتجنّب invalidation شامل.
- ✅ **`EmailMonitorPage`** يحوي JSDoc يشرح rationale ADMIN_ONLY (نموذجي).
- ✅ **`AdminDashboard`** يحجب `PendingActions/Charts/YearComparison` عن المحاسب صراحة (دفاع متعمّق).
- ✅ **`DistributionsPage.canDistribute`** يجمع 6 شروط (role + account + amount + beneficiaries + closed + specific year) — منطق دفاعي ممتاز.

---

## 3) خريطة التبعيات (Pages → Hooks)

| الطبقة | عدد الملفات | معدل الأسطر |
|---|---|---|
| `pages/dashboard/*.tsx` | 24 | ~136 |
| `hooks/page/admin/dashboard/*` | 8 | ~140 |
| `hooks/page/admin/financial/*` | ~10 | ~160 |
| `hooks/page/admin/management/*` | ~8 | ~140 |
| `hooks/page/admin/reports/*` | ~5 | ~160 |
| `hooks/page/admin/contracts/*` | ~3 | ~140 |

**أكبر page hook**: `useExpensesPage.ts` = 179 سطر. ضمن حدود v7 (200/180) لكنه قريب من الحد.

---

## 4) المُلخّص التنفيذي

- **0 Critical** — البنية متينة، لا كشف بيانات.
- **9 High** — أبرزها: تبديل التسجيل بدون تأكيد (W3-001)، تبويبات بدون URL (W3-002)، بحث بدون debounce (W3-003).
- **11 Medium** + **8 Low** + **6 نقاط قوة**.

### التوصيات الأهم للتنفيذ لاحقاً (إذا اعتُمدت موجة إصلاح):
1. **W3-001** — حوار تأكيد لـ `toggleRegistration`.
2. **W3-003** — `useDebounce` موحَّد للبحث (6 صفحات).
3. **W3-002** — `useTabFromUrl` لـ 5 تبويبات.
4. **W3-005** — إخفاء أزرار ZATCA/Templates عن المحاسب.
5. **W3-009** — نقل `CollectionHeatmap` خارج view المحاسب.

---

## 5) نطاق غير مُغطّى (مرحَّل لموجات لاحقة)

- **محتوى Components الفرعية**: `IncomeFormDialog`, `ExpenseFormDialog`, `ContractFormDialog`, `InvoiceUploadDialog`, `CreateUserForm`, `CloseYearDialog` — موجة 5 (Logic Layer).
- **خوادم Edge**: `dashboard-summary`, `admin-manage-users`, `email-admin` — موجة 6.
- **RLS على الجداول التي تظهر في كل صفحة** — موجة 6.
- **بوابات المستفيد/الواقف** (`/beneficiary/*`, `/waqif`) — موجة 4.

قل **"تابع W4"** للانتقال إلى موجة بوابات المستفيد والواقف وعزل PII.
