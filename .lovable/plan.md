## نتيجة الفحص الجنائي الكامل — 120 بند (4 أقسام × 30)

فحصت كل ادعاء ضد الكود الفعلي (rg/grep + قراءة ملفات). هذا الجدول يصنّف كل بند:

### 🟥 أخطاء حقيقية مُثبتة بالكود (أولوية تنفيذ)

| المصدر | البند | الإثبات في الكود | الحالة |
|---|---|---|---|
| شكوى المستخدم | "الإيرادات التعاقدية" بصفحة عقود المستفيد | `ContractStatsCards.tsx:68-73` ليس محمياً بـ `!isBeneficiary` | **خطأ** |
| المستفيد #4 | `useGreeting` يُستدعى مرتين | `useBeneficiaryDashboardPage.ts:115` + `BeneficiaryWelcomeCard.tsx:11` | **تكرار حقيقي** (timer مزدوج) |
| المستفيد #14 | عند `unreadCount===0` تُخفى كل الإشعارات المقروءة | `BeneficiaryNotificationsCard.tsx:47` شرط `\|\| unreadCount === 0` | **خطأ منطقي** |
| الناظر #3 | `key={index}` في StatsGrid | `DashboardStatsGrid.tsx:22` | **خطأ React** |
| الناظر #4 | `key={idx}` في KpiPanel | `DashboardKpiPanel.tsx:30` | **خطأ React** |
| تكرار جديد (لم يذكره التقرير) | نص "حسابك غير مرتبط" مكرر حرفياً في **6 ملفات** | `BeneficiaryDashboard`, `MySharePage`, `FinancialReportsPage`, `BeneficiarySettingsPage`, `AccountsViewPage`, `PropertiesViewPage` (السطر 49-62 في كل منها) | **تكرار حقيقي** |

### 🟨 ادعاءات صحيحة لكن **تصميم مقصود** أو سبق إصلاحها

| البند | السبب |
|---|---|
| المستفيد #6 (حصة بلا تمييز تقديري) | `EstimatedShareBadge` موجود فعلياً في `BeneficiaryStatsRow.tsx:53` — التقرير لم يلاحظه |
| المستفيد #16/#17 (إخفاء السلفة) | محمي بـ `useBeneficiaryWidgets` + `advanceEnabled` — مقصود إدارياً |
| المستفيد #19 (إخفاء بطاقات للواقف) | منطق `isVisible('...')` صحيح |
| الناظر #6/#7 (المتاح للتوزيع) | M4 السابق وضع `(تقديري)` في `useAdminDashboardStats.ts:95` — مُنجَز |
| الناظر #16 (PagePerformance زائد) | مُحمَّل `lazy` بالفعل عبر `AdminDashboard.tsx:29` — أثره معدوم على الأداء |

### ⬜ توصيات UX بحتة — تتطلب قرار منتج (خارج النطاق)

كل بنود "30 توصية" في الأقسام 2/4/6 ومعظم بنود التكرار في القسم 5: tooltips، watermark "بيانات تقديرية"، Print Layout، Dashboard Config، خط زمني لمراحل السنة، مقارنة YoY في لوحة المستفيد، Drill-down من KPI، فلاتر سريعة، وضع مختصر للناظر… كلها **مفتوحة بلا معايير قبول واضحة**. لا تُنفَّذ في هذه الجولة.

### ❌ ادعاءات غير دقيقة

- "تكرار بطاقة الترحيب بين الناظر والمستفيد" (#تكرار 1): مكونان مختلفان (`DashboardHeaderCard` vs `BeneficiaryWelcomeCard`) — تشابه سطحي، لا تكرار كود.
- "PendingActionsTable يخلط مهام" (#الناظر 18): الجدول مفصول داخلياً بأقسام — ادعاء غير دقيق.
- "لا توجد Skeleton مخصصة" (#المستفيد 22): `DashboardSkeleton` و`Skeleton` shadcn مستخدمان في عدة بطاقات.

---

## ما سأنفذه (6 إصلاحات فقط — كلها أخطاء مُثبتة)

### F1 — إخفاء "الإيرادات التعاقدية" من عقود المستفيد ⭐ (السبب الأصلي للشكوى)

**ملف**: `src/components/contracts/ContractStatsCards.tsx`

- لفّ البطاقة (السطور 68-73) بـ `{!isBeneficiary && (...)}`.
- `skeletonCount = isBeneficiary ? 2 : 5`، `gridCols = isBeneficiary ? 'sm:grid-cols-2 lg:grid-cols-2' : ...`.
- تحديث JSDoc للـ `variant`: "بطاقتان للمستفيد (إجمالي + نشطة)، 5 للناظر".

### F2 — إصلاح خطأ منطق إشعارات المستفيد

**ملف**: `src/components/beneficiary/dashboard/BeneficiaryNotificationsCard.tsx:47`

- استبدال `notifications.length === 0 || unreadCount === 0` بـ `notifications.length === 0`.
- نص `emptyText` يبقى للحالة الفارغة الحقيقية فقط. إذا كانت كلها مقروءة → تُعرض كقائمة عادية (الـ Badge بداخل العنصر يميّز المقروء/غير المقروء أصلاً).

### F3 — إزالة `useGreeting` المكرر

- `BeneficiaryWelcomeCard.tsx`: حذف `useGreeting()` وقبول `greetingData: GreetingData` كـ prop.
- `BeneficiaryDashboard.tsx`: تمرير `greetingData={greetingData}` (مُستخرَج فعلاً من الـ hook).
- استيراد النوع من `@/hooks/ui/useGreeting`.

### F4 — مفاتيح ثابتة في شبكتي الناظر

- `DashboardStatsGrid.tsx:22`: `key={index}` → `key={stat.title}`.
- `DashboardKpiPanel.tsx:30`: `key={idx}` → `key={kpi.label}`.

### F5 — توحيد نص "حسابك غير مرتبط" (تكرار في 6 ملفات)

- إنشاء `src/components/beneficiary/UnlinkedAccountNotice.tsx` — مكون عرض موحد (label/description/أيقونة).
- استبداله في الملفات الستة. لا يضيف CTA جديد (توصية UX) — فقط يزيل التكرار.
- يُضاف نص ثابت إلى `src/constants/beneficiaryCopy.ts` تحت `UNLINKED_ACCOUNT_COPY`.

### F6 — اختبار عقد بسيط لمنع الانكسار

`src/test/contractStatsBeneficiaryVariant.test.ts`: تأكيد أن النص "الإيرادات التعاقدية" **لا يظهر** عند `variant="beneficiary"` ويظهر عند `variant="admin"`.

---

## ما لن يُمَس

- لوحة الواقف بكل ملفاتها (ثانوية كما اتفقنا).
- باقي 100+ توصية UX من التقرير (Tooltips، Watermark، CTAs، فلاتر، YoY، Drill-down، Print Layout، Dashboard Config، خط زمني، مقارنات…).
- منطق المالية، RLS، migrations، RPC، Edge Functions.
- ملفات المصادقة المحمية و `client.ts`/`types.ts`/`.env`/`config.toml`.
- `EstimatedShareBadge` (موجود ويعمل).
- `PagePerformanceCard` (lazy بالفعل).

---

## التحقق

```bash
bunx vitest run src/test/contractStatsBeneficiaryVariant.test.ts
bunx vitest run
npm run lint
npx tsc --noEmit
```

فحص يدوي:
1. `/beneficiary/contracts` (مستفيد): بطاقتان فقط، لا "الإيرادات التعاقدية".
2. `/beneficiary` (مستفيد): إشعارات مقروءة تظهر بشكل صحيح؛ timer واحد فقط.
3. `/dashboard` (ناظر): لا تحذير React عن duplicate keys.
4. ست صفحات المستفيد عند عدم الربط: نفس البطاقة الموحدة.

---

## ملخص الحجم

| إصلاح | ملفات | أسطر تقديرياً |
|---|---|---|
| F1 | 1 | ~6 |
| F2 | 1 | ~1 |
| F3 | 2 | ~10 |
| F4 | 2 | ~2 |
| F5 | 8 (1 مكون جديد + 1 ثابت + 6 استبدالات) | ~80 |
| F6 | 1 | ~30 |
| **الإجمالي** | **15 ملف** | **~130 سطر** |

كلها أخطاء حقيقية مُثبتة بالكود، لا توصيات تخمينية.
