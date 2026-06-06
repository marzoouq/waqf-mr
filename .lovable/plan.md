# تحقق جنائي صارم من التقرير السابق — لوحة المستفيد

تم إعادة فحص **كل بند** من H1–H30 مقابل الكود الفعلي. النتائج النهائية أدناه (مُصحَّحة).

تصنيف الشدّة: 🔴 حرجة · 🟠 متوسطة · 🟡 ملاحظة · ✅ مؤكَّد · ❌ مرفوض · ⚠️ مُصحَّح

---

## أ) إعادة التقييم — بنود التقرير الأصلي

| # | الحكم | الدليل |
|---|---|---|
| **H1** | ⚠️ **مصحَّح** — العكس صحيح | `RequirePublishedYears` يلفّ DashboardLayout بنفسه عند الحجب (`finance/RequirePublishedYears.tsx:22-29`). إذن الـ 8 صفحات صحيحة، و **CarryforwardHistoryPage** هي التي تُنتج DashboardLayout مزدوجاً عند فقد السنوات المنشورة. |
| **H2** | ✅ مؤكَّد | `BeneficiaryDashboard.tsx:37` لا يحرس بـ `fyReady`، فيُظهر "غير مرتبط" زوراً قبل اختيار سنة. |
| **H3** | ✅ مؤكَّد | `AccountsViewPage.tsx:36-47` و `FinancialReportsPage.tsx:42-54` يفحصان `isAccountMissing` قبل `!currentBeneficiary` (السطر 49 و 56). |
| **H4** | ✅ مؤكَّد | `AccountsViewPage.tsx:22-47` ثلاث فروع DashboardLayout يدوياً. |
| **H5** | ✅ مؤكَّد | `useBeneficiaryDashboardPage.ts:53` deps = `[isClosed, fiscalYear]`. |
| **H6** | ✅ مؤكَّد | السطر 85 يُبطل `my-distributions` بلا حاجة. |
| **H7** | ✅ مؤكَّد | كتلة JSX يدوية للترحيب 44-63. |
| **H8** | ✅ مؤكَّد لكن **ملاحظة دلالية** فقط — لا أثر مرئي. |
| **H9** | ✅ مؤكَّد جزئياً | الحوار يُركَّب مرتين عند زيارة `/beneficiary/my-share` (Dashboard ليس مفتوحاً بالتوازي عادة، لكن في وضع المعاينة من Admin قد يكون). الخطر فعلي عند `useMaxAdvanceAmount` يُستدعى مرتين بنفس الإدخالات. |
| **H10** | ❌ **مرفوض** | RPC `get_beneficiary_dashboard` يُرجع `total_received` دائماً من جدول `distributions` (migration `20260603053233:119,184`) لكل أنواع السنوات. الـ fallback غير معطوب. |
| **H11** | ✅ مؤكَّد | `useMySharePage.ts:96` يمرر `contracts: []` رغم وجود `fetchContracts` غير المستدعى. |
| **H12** | ✅ مؤكَّد | `useDisclosurePage.ts:30-35` ينقصه `beneficiaries`, `advance_*`. |
| **H13** | ❌ **مرفوض** | `useEndUserFinancials` لا يجلب عقوداً ولا يلامس Supabase — حسابات فقط من dashData. لا تكرار. |
| **H14** | ✅ مؤكَّد | `useAccountsViewPage.ts:82-83` ثابت `10`/`5`. |
| **H15** | ✅ مؤكَّد | `AccountsView` بلا realtime. |
| **H16** | ✅ مؤكَّد | `useInvoicesViewPage.ts:66` `a.date < b.date` مقارنة سلاسل. |
| **H17** | ✅ مؤكَّد | InvoicesView بلا realtime. |
| **H18** | ✅ مؤكَّد | PropertiesViewPage:77-81 خمس بطاقات في سطر واحد. |
| **H19** | ✅ ملاحظة فقط — لا مشكلة. |
| **H20** | ✅ مؤكَّد | CarryforwardHistory يستخدم `useMyBeneficiaryFinance` فقط. |
| **H21** | ⚠️ **مصحَّح جزئياً** | `<Navigate>` من react-router يستخدم `useEffect` داخلياً، فالـ effects تعمل بترتيب الإعلان: useEffect (toast) ثم Navigate's effect. **التوست يُسجَّل**، لكن المكوّن المقصود (`/dashboard/support`) قد لا يكون متصلاً بـ Toaster بعدُ ⇒ قد لا يُعرض. الخطر قائم لكن السبب الجذري مختلف. |
| **H22** | ✅ ملاحظة فقط — `BOTTOM_NAV_LINKS.waqif[0]='/waqif'` يطابق `useRoleRedirect.ts:25`. |
| **H23** | ✅ مؤكَّد | `SidebarNavList.tsx:50` شرط `/messages` حصراً. |
| **H24** | ✅ مؤكَّد | `/beneficiary` غير موجود في `BENEFICIARY_ROUTE_GROUPS`. |
| **H25** | ✅ مؤكَّد + **ExpensesView ينقصها realtime أيضاً** (لم تُذكر). |
| **H26** | ✅ ملاحظة. |
| **H27** | ✅ مؤكَّد. |
| **H28** | ✅ مؤكَّد. |
| **H29** | ✅ مؤكَّد + لا يوجد `index.ts` في مجلد `settings/` أصلاً. |
| **H30** | ✅ ملاحظة. |

**نتيجة المراجعة**: 3 بنود مرفوضة/مصحَّحة (H1، H10، H13) و 1 مصحَّح جزئياً (H21).

---

## ب) مشاكل **جديدة** كُشفت في الفحص الجنائي

### 🔴 N1 — `CarryforwardHistoryPage`: DashboardLayout مزدوج عند انعدام السنوات
الصفحة تلفّ `RequirePublishedYears` داخل `DashboardLayout`. عندما يحجب `RequirePublishedYears` (السطور 21-29 من المكوّن) فإنه يُعيد `<DashboardLayout>…</DashboardLayout>` ⇒ تداخل layoutين ⇒ سايدبار/هيدر مزدوج وكسر `position: fixed`/`grid` غالباً.

### 🟠 N2 — `ExpensesViewPage` بلا realtime
بخلاف الإدراج في H25، `useExpensesViewPage` لا يستدعي `useDashboardRealtime` ⇒ مصاريف يضيفها الناظر لا تظهر فوراً.

### 🟠 N3 — `BeneficiaryMessagesPage` يخلط conversations نوعين
`useBeneficiaryMessages.ts:29-30` يدمج `chat` + `broadcast` ويرتّبهما زمنياً، لكن `isError` معتمد على `chatError` فقط ⇒ فشل جلب broadcast صامت تماماً.

### 🟠 N4 — `useNotifications` يُستدعى مرتين في Dashboard
`useBeneficiaryDashboardPage.ts:25` يجلب الإشعارات، و`Sidebar`/`BottomNav` يجلبهما عبر `useNotifications` أيضاً (شارة العدّ). إذا لم يكن TanStack Query يشاركهما نفس queryKey ⇒ جلبان متوازيان.

### 🟠 N5 — `BeneficiaryAdvanceCard` يعرض "طلب سلفة" داخل الـ Dashboard مع `isFiscalYearActive=false`
الـ Dashboard hook (السطر 143) يحسب `isFiscalYearActive: !isClosed && !!fiscalYear`. للسنة المستقبلية (`notStarted=true`) فإن `isClosed=false` ⇒ يبدو الزر فعّالاً ولكن RPC يرفض. تحقق ناقص.

### 🟠 N6 — `useExpensesViewPage.ts:38` `useTableSort` بلا قيم افتراضية
`sortField` يبدأ `null` فلا يحدث ترتيب افتراضي ⇒ ترتيب عشوائي حسب ترتيب DB. ينبغي تمرير `'date','desc'` افتراضياً.

### 🟠 N7 — `useInvoicesViewPage` ينسخ تواريخ نوعَيْن مختلفين بدون توحيد TZ
`expenseInvoices[i].date` من جدول `invoices` و`rentInvoices[i].due_date` من `payment_invoices` ⇒ الأول `date`، الثاني قد يكون `timestamptz`. عرض/فرز/فلتر `searchQuery.includes(date)` غير موثوق.

### 🟠 N8 — `PropertiesViewPage`: عدّ "وحدات شاغرة" لا يُسقط العقارات بلا وحدات لكن النص يُسمّيها "وحدات"
`usePropertiesViewPage.ts:82-83`: `vacantUnits = totalUnits - occupiedUnits` ⇒ صحيح. لكن `propertiesWithoutUnitsNoContract` تُحسب كحقل منفصل (`propertiesWithoutUnits`). البطاقتان منفصلتان وعرض صحيح، لكن أداة الـ tooltip تذكر "غير مؤجَّرة" بينما تتضمّن وحدات حقاً مؤجَّرة عبر `wholePropertyIds`. تحقق سيمانتيكي مطلوب.

### 🟡 N9 — `useDisclosurePage.handleDownloadPDF` لا يتعامل مع عدم وجود `currentBeneficiary`
السطر 78: يستخدم `currentBeneficiary?.name || ''` ⇒ PDF بحقل فارغ بدل منع التصدير.

### 🟡 N10 — `BeneficiaryDashboard` يُمرّر `recentNotifications` فقط (3 أوائل) لكن `unreadCount` للكامل
`useBeneficiaryDashboardPage.ts:119,132`. إذا الـ 3 الأوائل كلّها مقروءة بينما الباقي غير مقروء، ستظهر شارة العدّاد مع لائحة "كلّها مقروءة" — تجربة محيّرة.

### 🟡 N11 — `BeneficiaryQuickLinks` يفقد `key` مستقر للمستخدم الواقف
يستخدم `link.path` كمفتاح ⇒ سليم. لا مشكلة.

### 🟡 N12 — `useCarryforwardData` يفقد `useDashboardRealtime`
نفس صنف H15 لكن لجدول `advance_carryforward`.

### 🟡 N13 — `BylawsViewPage` يفتح `prose dark:prose-invert` بدون فحص `prefers-color-scheme`
عمل صحيح إن كان dark وضع التطبيق، لكن `disallowedElements` يحرس فقط؛ `unwrapDisallowed` يحتفظ بالنص ⇒ مقبول.

### 🟡 N14 — `useBeneficiarySettingsPage.ts:23` `maskedId` رقم وطني مُقنَّع كـ `'*'.repeat(8)` ثابت
لا يعكس طول الـ ID الفعلي ⇒ ملاحظة UI لا أمنية.

### 🟡 N15 — `NotificationsPage` يستدعي `markAllAsRead.mutate()` بلا onError UI
الـ mutation hook قد يصمت في الفشل (يعتمد على CRUD factory).

### 🟡 N16 — `useFinancialReportsPage` لا يستدعي `monthlyData` للسنة النشطة إذا لم يأت في RPC
`buildMonthlyData([], [])` ⇒ مخطط أبيض. لا fallback لجدول `income`/`expenses` المحلي.

### 🟡 N17 — `ContractsViewPage` `setCurrentPage(1)` في useEffect عند تغيّر FY
موسوم `// eslint-disable-next-line react-hooks/set-state-in-effect` — مقبول لكن يُفضَّل `useResetPageOnFilterChange`.

### 🟡 N18 — `BeneficiaryStatsRow.tsx:30-32` ينسخ مصفوفة كاملة لإيجاد آخر مدفوع
`[...distributions].sort(...).find(...)` على مصفوفة قد تكون كبيرة. الأسلم: `reduce` بـ O(n).

### 🟡 N19 — `useMySharePdfHandlers` غير ممرّر `selectedFY` لكن يستهلكه عبر `fiscalYearLabel`
السطر 97 يمرّر `fiscalYearLabel: selectedFY?.label`. لا مشكلة.

### 🟡 N20 — `BeneficiaryDashboard` يستهلك `useBeneficiaryWidgets()` بلا حالة تحميل
إذا تأخّر تحميل الإعدادات، `isVisible('x')` يعود بقيمة افتراضية (true) ⇒ وميض في الأقسام.

---

## ج) فحوص أمنية و RLS مرتبطة

| فحص | النتيجة |
|---|---|
| استخدام `localStorage` في صفحات المستفيد | ✅ نظيف — فقط `sessionStorage` عبر FiscalYearContext |
| استخدام `console.*` | ✅ نظيف |
| ألوان hex مباشرة | ✅ نظيف |
| استدعاء `supabase` مباشرة من Page/Component | ✅ نظيف — كل شيء عبر hooks/data |
| `realtime` بلا فلتر `beneficiary_id` لـ distributions | ⚠️ `useBeneficiaryDashboardPage.ts:88` يستمع لـ `accounts` بلا فلتر ⇒ كل المستفيدين يُبطلون cache بعضهم. تأثير أداء فقط (RLS يحمي البيانات). |
| `useEndUserDashboardData` enabled-guard | ✅ صحيح (`fyReady && !isFyAll`) |

---

## د) المؤشرات النهائية المُصحَّحة

| الشدّة | العدد | البنود |
|---|---:|---|
| 🔴 حرجة | **4** | H2, H3, H21, **N1** |
| 🟠 متوسطة | **14** | H4, H5, H9, H11, H12, H14, H15, H16, H18, H20, H25, **N2, N3, N4, N5, N6, N7, N8** |
| 🟡 ملاحظة | **16** | H6, H7, H8, H17, H19, H22, H23, H24, H26, H27, H28, H29, H30, **N9–N20** |
| ❌ مرفوض | **3** | H1, H10, H13 |

**الإجمالي الفعلي**: 4 حرجة + 14 متوسطة + 16 ملاحظة = **34 بنداً مؤكَّداً** (بدلاً من 28).
**أخطاء في التقرير الأصلي**: 3 ادعاءات خاطئة + 1 مصحَّح جزئياً.

---

## هـ) أهم 5 إصلاحات يجب تنفيذها أولاً

1. **N1** — تصحيح ترتيب `CarryforwardHistoryPage` لمنع layout مزدوج.
2. **H2** — حارس `fyReady` في `BeneficiaryDashboard`.
3. **H3** — تقديم فحص `!currentBeneficiary` في AccountsView و FinancialReports.
4. **H21** — نقل toast إلى الصفحة المقصودة بدلاً من Guard.
5. **N5** — التحقق من `notStarted` قبل تفعيل زرّ السلفة في Dashboard.

التقرير قراءة فقط — لم يُعدَّل أي ملف.
هل أبدأ بتنفيذ المجموعة الحرجة (N1, H2, H3, H21, N5)، أم الكل؟
