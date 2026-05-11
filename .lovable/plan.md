# تدقيق معماري شامل لمكونات الواجهة

## النتيجة المختصرة

البنية **سليمة بنيوياً** (Page Hook Pattern مُطبّق، لا `supabase.from` ولا `useQuery` في المكونات، routes lazy، فصل واضح بين `pages/components/hooks/contexts`). المشاكل الموجودة **متوسطة وموضعية** — لا تستدعي إعادة هيكلة جذرية، بل تنظيفات مستهدفة.

---

## مرحلة 1 — التدقيق (لا كود)

سيتم إنتاج **تقرير ARCHITECTURE_AUDIT.md** في `/mnt/documents/` يغطي:

### 1. خريطة شجرة المكونات
- Mermaid diagram لأشجار المكونات الثلاث الكبرى:
  - شجرة Admin Dashboard (الأكثر تعقيداً)
  - شجرة Contracts (تحتوي accordion + form + accrual)
  - شجرة Beneficiary Dashboard
- كل عقدة موسومة بـ **Container (ذكي)** أو **Presentational (بسيط)** أو **Hybrid**.

### 2. مصفوفة النتائج (مرتّبة بالخطورة)

| # | البند | الخطورة | الملفات |
|---|---|---|---|
| 1 | **مكونات Hybrid: عرض + جلب إعدادات** — `Sidebar`, `WaqfSettingsTab`, `MenuCustomizationTab` تستدعي `useSetting`/`useEffect` مباشرة بدل تمرير القيم من page hook | عالية | 11 مكوّن في `settings/` |
| 2 | **prop drilling مؤكّد** — `WaqifWelcomeCard` يستقبل 6 props وصفية تُجمَّع في كائن واحد | متوسطة | `pages/waqif/WaqifDashboard.tsx` |
| 3 | **مكونات > 180 سطر** بمسؤوليات متعددة: `EmailMonitorPage` (286), `ZatcaCertificatesTab` (207), `Sidebar` (201), `BalanceSheetReport` (197), `PermissionsControlPanel` (195), `ContractRentalModeSection` (195), `MonthlyAccrualTable` (193), `MySharePage` (191), `SystemSettingsTab` (189), `BylawDialogs` (183) | متوسطة | 10 ملفات |
| 4 | **Page Hooks > 180 سطر** (god-hook smell): `useEmailMonitorPage` (210), `useCollectionData` (205), `useInvoicesPage` (199), `useIncomePage` (198), `useAiChat` (197), `usePaymentInvoicesTab` (196), `useZatcaSettings` (195), `useExpensesPage` (185) | متوسطة | 8 hooks |
| 5 | **استخدام شبه معدوم لـ `React.memo`** (0 ملف) و`useCallback` (5 فقط) — جداول كبيرة (`InvoiceGridView`, `MonthlyAccrualTable`, `ContractAccordionGroup`, `IncomeDesktopTable`) تُعيد render كاملاً عند أي تغيير في الأب | منخفضة–متوسطة | جداول العرض |
| 6 | **Context قاصر** — `ContractsContext` موجود لكن غير مستخدم خارج طبقة محدودة، ولا يوجد context لـ Settings رغم تكرار جلب نفس البيانات في كل tab | منخفضة | settings tabs |
| 7 | **`useEffect` في مكونات إعدادات** (10 ملفات) — معظمها لمزامنة form state من server، يمكن استبداله بـ `useForm({ values })` أو `key` reset | منخفضة | settings/* |

### 3. قواعد للتوثيق (كنتيجة)
يتضمن التقرير قسم "Rules" يُكتب أيضاً في الذاكرة (`mem://`):
- **Container vs Presentational**: تعريف رسمي + قائمة فحص.
- **حدود استدعاء `useSetting`/`useQuery`/`useMutation`**: داخل page hooks فقط.
- **حد أقصى للسطور**: مكوّن > 200 يُقسَّم؛ page hook > 180 يُجزَّأ إلى sub-hooks.
- **Props > 5**: علامة على ضرورة التجميع في كائن semantic أو رفع state إلى context.
- **memoization**: إلزامي على صفوف الجداول ومعالجات `onSort/onEdit/onDelete` المُمرَّرة لأطفال متعددين.

---

## مرحلة 2 — التنفيذ بترتيب الخطورة (دفعات منفصلة)

### دفعة A — إصلاح Hybrid في settings/* (البند 1)
- نقل كل `useSetting`/`useEffect` من 11 مكوّن settings إلى sub-hooks لكل tab.
- المكونات تتحول إلى presentational (تستقبل value + onChange).
- اختبارات Vitest لكل sub-hook.

### دفعة B — تقسيم المكونات الضخمة (البند 3)
- `EmailMonitorPage` → `EmailMonitorFilters` + `EmailMonitorStats` + `EmailMonitorTable` + `DlqRetryPanel`.
- `Sidebar` → `SidebarHeader` + `SidebarNav` + `SidebarFooter` + `MobileSidebarTrigger`.
- `MonthlyAccrualTable` → استخراج صفّ memoized + header منفصل.
- `BylawDialogs` → dialog واحد لكل نوع.
- باقي الـ 6 ملفات بنفس النمط.

### دفعة C — تجزئة god-hooks (البند 4)
- مثال `useInvoicesPage` → `useInvoicesFilters` + `useInvoicesMutations` + `useInvoicesDerived` ثم composite hook رفيع.
- نفس النمط لـ 8 hooks.

### دفعة D — معالجة prop drilling (البند 2)
- `WaqifWelcomeCard`: تجميع الـ 6 props في `welcomeData: WelcomeData`.
- مراجعة المواقع الأخرى التي تمرر >5 props.

### دفعة E — memoization مُستهدف (البند 5)
- `React.memo` + `useCallback` على صفوف الجداول الكبيرة فقط (لا memoization عشوائي).

### دفعة F — تنظيف useEffect في settings (البند 7)
- استبدال `useEffect(setForm, [data])` بـ `useForm({ values })` أو `key={data?.id}`.

### دفعة G — توسعة الـ contexts عند الحاجة (البند 6)
- إضافة `SettingsContext` فقط إن أثبتت الدفعة A تكرار جلب فعلي.

---

## التفاصيل التقنية

**خارج النطاق:**
- `AuthContext`, `ProtectedRoute`, `SecurityGuard` (محظور تعديلها).
- `src/components/ui/` (shadcn — لا تُلمس).
- منطق العمل المالي/الضريبي (تدقيق UI فقط).
- RLS، Edge Functions، migrations.

**معايير القبول لكل دفعة:**
- build نظيف + الاختبارات الحالية تمر.
- لا تغيّر في سلوك المستخدم ظاهرياً.
- نفس DOM tree ونفس CSS classes.

**المخرجات النهائية:**
- `/mnt/documents/ARCHITECTURE_AUDIT.md` (التقرير الكامل).
- `/mnt/documents/component-trees.mmd` (Mermaid).
- تحديث `mem://technical/architecture/` بقواعد container/presentational وحدود السطور.
- (حسب الموافقة) تنفيذ الدفعات A→G لاحقاً.

**يبدأ التنفيذ بإنتاج تقرير المرحلة 1 فقط** — لا تعديلات كود حتى مراجعته والموافقة على دفعة.