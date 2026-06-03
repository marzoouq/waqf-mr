
# تقرير تدقيق شامل — تناقض البطاقات + جودة المعمارية

تحليل قراءة فقط — لا تعديلات على الكود حتى الموافقة. النقاط التالية موثّقة بأرقام أسطر ومراجع.

---

## القسم 1 — تناقضات حسابية حقيقية بين لوحة الناظر والمستفيد (P0)

### 1.1 السبب الجذري: مصدران مختلفان للأرقام نفسها
- **الناظر** يقرأ من Edge Function `dashboard-summary` → RPC `get_dashboard_full_summary` → `totals.*` و `available_amount`.
- **المستفيد** يقرأ من RPC مختلفة `get_beneficiary_dashboard` → `account.*` و `available_amount` و `my_share`.

كلتا الدالتين تحسبان نفس الحقول بمنطق مختلف. هذا يخالف صراحةً قاعدة `unified-collection-and-income-sync` و `useMyShare`'s "single source of truth from RPC".

### 1.2 تناقض حرج: `available_amount` و `my_share` للسنة النشطة
- في `get_dashboard_full_summary` (السطر 123 من تعريف الدالة): للسنة النشطة يحسب
  `v_available_amount := v_waqf_revenue - v_waqf_corpus_manual` ← **قيمة حقيقية**.
- في `get_beneficiary_dashboard` (السطر 134): للسنة النشطة يضع
  `v_available_amount := 0` و `v_my_share` لا يُحسب أصلاً (محصور داخل `IF status='closed'` السطر 67).

النتيجة:
- لوحة الناظر `/dashboard/distributions` تعرض "المتاح للتوزيع" و "ريع الوقف" بأرقام صحيحة.
- لوحة المستفيد تعرض `حصتي = 0 ر.س` للسنة النشطة دائماً.
- `useMyShare` في `src/hooks/domain/financial/useMyShare.ts:48`: شرط `isFinite(serverMyShare)` يقبل `0`، فيُرجع 0 بدل الـ fallback المحلي. حتى لو سُمح بالـ fallback، فهو يستخدم `fin.availableAmount` الذي يساوي 0 أيضاً.

### 1.3 تناقض في `netAfterZakat` — ثلاث صيغ متوازية
- RPC الناظر: `v_net_after_zakat := v_net_after_vat - v_zakat_amount` (مباشر).
- RPC المستفيد: `'net_after_zakat', COALESCE(v_account.net_after_vat,0) - COALESCE(v_account.zakat_amount,0)` (داخل `account`، فقط عند وجود حساب).
- العميل `useEndUserFinancials.ts:24`: `Math.max(0, account?.net_after_zakat ?? netAfterVat - zakatAmount)` — حماية UI تختلف عن DB.
- `AccountsSummaryCards.tsx:54`: `computedNetAfterZakat = netAfterZakat ?? (netAfterVat - zakatAmount)` — صيغة رابعة.

### 1.4 تناقض في `collectionSummary`
- الناظر: `paidLikeCount = paid_count + partial_count` من RPC (`useAdminDashboardStats.ts:81`).
- المستفيد: لا يعرض هذه البطاقة، لكن `useMyDistributions` يستخدم `accounts` و `distributions` فقط بدون `partial_count`. التعليق "تعريف موحّد مع لوحة المستفيد" غير دقيق.

### 1.5 تناقض `serverMyShare = 0` يحجب التقدير المحلي
- في `useMyShare.ts:48` المنطق:
  ```ts
  if (serverMyShare !== null && serverMyShare !== undefined && isFinite(serverMyShare)) return serverMyShare;
  ```
  `0` يمر هذا الشرط → الـ fallback المحلي يُلغى.
- لكن `dashData?.my_share` يأتي دائماً من RPC حتى لو كان `0` بسبب السنة النشطة → المستفيد يرى `0` بدل تقدير.

### 1.6 خصومات السلف والمرحّل
- بطاقة "السُلف المصروفة" في `MyShareSummaryCards`: تأتي من `dashData.paid_advances_total`.
- البطاقة المقابلة في `/dashboard/distributions` (`p.totalAdvances`): مصدر مختلف عبر `useDistributionsPage`.
- لم أتحقق من مطابقتهما — يحتاج فحص.

---

## القسم 2 — مشاكل معمارية (P1)

### 2.1 ازدواج حساب المالية في ثلاث طبقات
- `useComputedFinancials` (151 سطر) — حساب عميل من Raw data، يُستخدم في `AccountsPage`.
- `useEndUserFinancials` (60 سطر) — يلتف فوق RPC المستفيد.
- `useAdminDashboardData` — يلتف فوق RPC الناظر.

ثلاث صيغ متوازية لنفس المفاهيم (`netAfterExpenses`, `waqfRevenue`, ...) معرّضة للانحراف. هذا يخالف قاعدة `revenue-recognition-rules` و `financial-accounting-and-distribution-logic`.

### 2.2 طبقة `application/dashboard` أصبحت غلافاً نحيفاً
- `useEndUserDashboardData.ts` فقط 3 أسطر فعلية تعيد تصدير `useBeneficiaryDashboardRpc`.
- مخالف مبدئياً لـ `hooks-layering-data-vs-domain` — تضيف مستوى بدون قيمة (مكونان فقط من 14 يستخدمانها).

### 2.3 معاملات `@deprecated` ما زالت تُمرَّر
- `useAdminDashboardStats.ts:27-50`: 8 معاملات معلّمة `@deprecated` (`contractualRevenue`, `netAfterZakat`, `availableAmount`, `adminShare`, `waqifShare`, `distributionsAmount`, `occupancy`).
- `useAdminDashboardData.ts:96-99` ما زال يمرّرها كلها — كود ميت.

### 2.4 `useAdminDashboardPage` يدير realtime + يجمع 4 hooks (128 سطر)
- منطق `heatmapBounds` IIFE داخل return — يجب نقله إلى `useMemo` أو helper.
- يمزج إعداد realtime channels (3 قنوات) مع تنسيق UI props — كان يجب فصلهما في `useAdminDashboardRealtime`.

### 2.5 `BeneficiaryDashboard` يدير قناة realtime داخل page hook
- `useBeneficiaryDashboardPage.ts:82-118` — 37 سطر لإعداد realtime channel.
- يجب استخراجه إلى `useBeneficiaryDashboardRealtime` (data hook).

### 2.6 `useMySharePage.ts` (109 سطر) يستدعي 6 hooks
- `useEndUserDashboardData`, `useEndUserFinancials`, `useMyShare`, `useMyDistributions`, `useContractsForPdf`, `useDashboardRealtime`, `useMySharePdfHandlers`.
- مقبول لكنه يقترب من حد التعقيد. هناك مزج بين بيانات السلف من 3 مصادر (`my_advances`, `paid_advances_total`, `my_carryforwards`) — قد ينحرف عن `/dashboard/distributions`.

### 2.7 `hooks/page/admin/financial/` يحتوي 25+ ملف بدون تجميع موضوعي
- يحوي `invoice*` (8 ملفات), `accounts*` (3), `distributions*`, `expenses*`, `income*`, `payment*`, `collection*` — يجب تقسيم لمجلدات فرعية كما حدث في `hooks/data/financial/`.

### 2.8 `useAdminDashboardStats` يحوي ملاحظات حول بطاقات "رُحّلت لصفحات أخرى"
- تعليقات السطر 116-120 توثّق نقل بطاقات (الإيرادات التعاقدية، المتاح للتوزيع، حصة الناظر/الواقف) إلى صفحاتها — جيد، لكن الواجهة (props) لم تُنظَّف فعلياً.

---

## القسم 3 — ملاحظات أصغر (P2)

### 3.1 `useBeneficiaryDashboardPage:73` displayName fallback يعرض "الناظر" / "الواقف"
- في لوحة المستفيد، الـ fallback يستخدم اسم الدور — مضلِّل للمستخدمين النهائيين.

### 3.2 `useAdminDashboardPage` يستخدم 3 قنوات realtime مع `app_settings` في القناة المالية + realtime منفصل للرسائل
- جيد لكن `dashboard_keys.prefixes.summary` يبطل كل المفاتيح عند أي تغيير في `app_settings` — قد يسبب refetch مفرط عند تعديل أي إعداد.

### 3.3 `AccountsSummaryCards.tsx` ينفذ تحقق `isOverridden` للقيم اليدوية في الواجهة
- منطق مقارنة (line 36) داخل مكون عرض — يفترض أن يكون في hook أو util.

### 3.4 `dashboardSummarySchema` يتحقق فقط من الحقول الأساسية ويترك `aggregated` كـ `unknown`
- `useDashboardSummary.ts:43` — فقدان type safety لأهم جزء.

### 3.5 ملفات أكبر من 200 سطر مخالفة لـ `code-style-and-naming`
- `useComputedFinancials.test.ts` (682), `usePropertiesViewPage.ts` (201), `MonthlyAccrualTable.tsx` (193) — قبولها يعتمد على طبيعتها، لكن `usePropertiesViewPage` يتجاوز الحد.

### 3.6 `useEndUserFinancials` يحوي `Math.max(0, ...)` لـ `netAfterZakat`
- المعالجة الصامتة للقيم السالبة قد تخفي أخطاء RPC. يجب تسجيل تحذير عبر `logger` عند الحدوث.

---

## القسم 4 — خطة الإصلاح المرتّبة (حرجة → اختيارية)

### المرحلة A — تناقضات حسابية (P0، يجب الإصلاح فوراً)
1. **توحيد `available_amount` و `my_share` للسنة النشطة في RPC المستفيد**: تعديل `get_beneficiary_dashboard` ليحسب `v_available_amount` و `v_my_share` تقديرياً للسنة النشطة بنفس صيغة `get_dashboard_full_summary` (`waqf_revenue - waqf_corpus_manual`) مع رفع علم `my_share_is_estimated = true`.
2. **استخراج صيغة `netAfterZakat` إلى دالة SQL واحدة** (`fn_compute_net_after_zakat`) واستدعاؤها من كلا الـ RPC + تنظيف الـ fallbacks في `useEndUserFinancials` و `AccountsSummaryCards`.
3. **توثيق وفحص `paid_advances_total` vs `totalAdvances`** بين صفحة حصتي وصفحة التوزيعات — كتابة اختبار تكامل يقارن القيمتين لنفس السنة.
4. **إصلاح `useMyShare` ليفرّق بين `serverMyShare = null` و `= 0`**: تمرير إشارة صريحة `my_share_is_estimated` بدل الاعتماد على `null`/`0`.

### المرحلة B — تنظيف المعمارية (P1)
5. **حذف المعاملات `@deprecated`** من `useAdminDashboardStats` و `useAdminDashboardData` (8 معاملات).
6. **إزالة طبقة `application/dashboard` الزائدة** أو ترقيتها لتحوي منطقاً حقيقياً (مثل توحيد المالية).
7. **دمج `useComputedFinancials` و `useEndUserFinancials` في `useFinancialMetrics`** موحّد يعمل سواء كانت البيانات من RPC أو من Raw data (مع flag).
8. **استخراج realtime channels** إلى `useAdminDashboardRealtime` و `useBeneficiaryDashboardRealtime` (data hooks).
9. **تقسيم `hooks/page/admin/financial/`** إلى `invoices/`, `accounts/`, `distributions/`, `expenses/`, `income/`, `payments/`.

### المرحلة C — تحسينات (P2)
10. **تكميل Zod schema** لـ `dashboardSummarySchema.aggregated` مع تحقق صارم.
11. **إصلاح `displayName` fallback** في `useBeneficiaryDashboardPage`.
12. **تضييق realtime invalidation** لـ `app_settings` ليستهدف مفاتيح محددة بدل كل summary.
13. **نقل `isOverridden`** من `AccountsSummaryCards` إلى hook أو util.
14. **تقسيم `usePropertiesViewPage.ts`** (201 سطر).

### المرحلة D — اختياري
15. توحيد `collectionSummary` بحيث يظهر بنفس الصيغة في لوحة المستفيد (بطاقة جديدة).
16. إضافة اختبار صحة `consistency` يقارن `totals.*` من `dashboard-summary` مع `account.*` من `get_beneficiary_dashboard` لنفس السنة في pipeline.

---

## ملاحظة منهجية
هذا تدقيق قراءة فقط. لا تغييرات حتى موافقتك. عند الموافقة، أقترح البدء بـ **المرحلة A فقط** كـ PR منفصل لأنها سبب التناقض الذي يراه المستخدم فعلياً، وتأجيل B/C/D لـ PRs لاحقة لتجنّب diff ضخم.
