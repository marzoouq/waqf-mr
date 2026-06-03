# خطة توحيد بطاقات اللوحات الثلاث

تقرير شامل لاتساق البطاقات مع مصادر البيانات. **17 تناقضاً موثّقاً** عبر file:line. الإصلاحات مرتبة من الأخطر (تسرب بيانات/أرقام خاطئة) إلى تحسينات اختيارية.

---

## النتائج الرئيسية

### 🔴 خطورة قصوى — تسريبات بيانات (لوحة المحاسب)
1. **آلية `visibility:'admin-only'` ميتة** — `useAdminDashboardStats.ts:99-112` يحتوي فلتراً سليماً، لكن **لا توجد ولا بطاقة واحدة** تحمل هذا الوسم. المحاسب يرى كل شيء.
2. **`waqf_revenue` يظهر للمحاسب باسم "التدفق النقدي الصافي"** — `useAdminDashboardStats.ts:92,106`. مخالف لقاعدة `mem://security/access-control/accountant-dashboard-filtering`.
3. **تنبيه "نسب افتراضية" يكشف نسب الواقف/الناظر للمحاسب** — `DashboardAlerts.tsx:108-123` بدون شرط دور.
4. **`PendingActionsTable` و`YearComparisonCard` و`DashboardCharts` تظهر للمحاسب** — `AdminDashboard.tsx:99-115` بدون فلتر.

### 🔴 خطورة قصوى — أرقام خاطئة معروضة
5. **`unpaid_count` معروض بتسمية "متأخر"** — `CollectionSummaryCard.tsx:76-82`. الـ RPC يُرجع `overdue_count` منفصلاً (`useAdminDashboardStats.ts:71-76`) لكنه مُهمَل تماماً. الرقم المعروض يشمل فواتير لم يحن استحقاقها بعد.
6. **`total_received` من RPC مُهمَل في صفحة "حصتي"** — `useMySharePage.ts:74` يعيد الحساب من query منفصل. عند غياب `account` (سنة نشطة) يُرجع `0` رغم وجود توزيعات فعلية (`distributionSummary.ts:23`).
7. **فاتورة pending فائتة تُحسب مرتين** — `useAccountantDashboardData.ts:64-67` و`119-122`. تظهر في "متأخرة" و"معلقة" معاً.

### 🟠 خطورة عالية — تناقضات حسابية بين مسارين
8. **`available_amount` غير متماثل**:
   - RPC الناظر: `waqf_revenue - waqf_corpus_manual` (يسمح بالسالب)
   - RPC المستفيد: `GREATEST(0, …)` (يصفّر السالب)
   - `closedYearFinancials` (AccountsPage): `Math.max(0, …)`
   - النتيجة: نفس السنة بثلاث قيم مختلفة في ثلاث صفحات.
9. **`net_after_zakat` بمسارين** — RPC يعيد الحساب دائماً، بينما `closedYearFinancials` يقرأ `account.net_after_zakat` المخزَّن أولاً.
10. **YoY `prevNetAfterExpenses` ناقص** — `useDashboardSummary:59` يحسب `prev_income - prev_expenses` متجاهلاً `corpus_previous`. شارة YoY في بطاقة "صافي بعد المصروفات" خاطئة.
11. **`paidAdvancesTotal` و`carryforward_balance` بنطاقَين زمنيَّين** — صفحة "حصتي" تعرض السنة الحالية فقط، صفحة "سجل الترحيل" تعرض كل السنوات تحت نفس التسمية.
12. **`monthlyCollection` للمحاسب يجمّع بـ `due_date`** — `useAccountantDashboardData.ts:97`. يعرض "متوقع شهري" لا "محصَّل شهري".

### 🟡 خطورة متوسطة
13. **`useAccountantDashboardData` يُستدعى للناظر بلا داعٍ** — `useAdminDashboardPage.ts:67-70`.
14. **`usingFallbackPct` يفحص 3 إعدادات في Dashboard و2 في AccountsPage** — تنبيه يظهر/يختفي بشكل غير متسق.
15. **`waqf_corpus_percentage` إعداد ميت** — يُحمَّل من DB لكن لا يُستخدم في أي صيغة (RPC أو عميل). يربك عدّاد `usingFallbackPct`.
16. **`my_share` fallback يستخدم query منفصل لـ `totalBeneficiaryPercentage`** — قد يُخالف الـ cache مؤقتاً.
17. **`share_percentage` يُعرض كرقم مطلق دون قسمة على الإجمالي** — المستفيد يرى "20%" دون معرفة الإجمالي.

---

## مراحل التنفيذ المقترحة (read-only الآن — للتنفيذ في build mode لاحقاً)

### Stage 1 — أمنية حرجة (لوحة المحاسب)
- وسم البطاقات الحساسة بـ `visibility:'admin-only'` في `useAdminDashboardStats.ts` (التدفق النقدي الصافي على الأقل).
- إضافة شرط `role==='admin'` على `DashboardAlerts` تنبيه `usingFallbackPct` و`PendingActionsTable` و`YearComparisonCard` و`DashboardCharts`.
- تحديث `mem://security/access-control/accountant-dashboard-filtering` بقائمة البطاقات المعتمدة للمحاسب.

### Stage 2 — تصحيح الأرقام المعروضة
- استبدال `unpaidCount` بـ `overdue_count` في `CollectionSummaryCard` أو تغيير التسمية إلى "غير مدفوع".
- جعل `useMySharePage.totalReceived` يستخدم `dashData.total_received` من RPC، مع fallback محلي فقط عند `null/undefined`.
- إصلاح ازدواج عدّ الفواتير في `useAccountantDashboardData` (pending+overdue mutual exclusive).

### Stage 3 — توحيد المنطق الحسابي
- توحيد قاعدة `GREATEST(0, available_amount)` في RPC الناظر لتطابق RPC المستفيد و`closedYearFinancials`.
- توحيد مصدر `net_after_zakat`: قراءة `account.net_after_zakat` المخزَّن أولاً في كلا الـ RPC.
- إصلاح YoY: إعادة `prev_corpus_previous` و`prev_vat` و`prev_zakat` من RPC وحساب الصافي صحيحاً في العميل.
- توحيد نطاق `paidAdvancesTotal` و`carryforward_balance` بين صفحتَي "حصتي" و"سجل الترحيل" (إما تسميات مختلفة أو فلتر موحَّد).

### Stage 4 — تنظيف وتحسينات
- إخراج `useAccountantDashboardData` خلف شرط `if (role==='accountant')`.
- توحيد فحص `usingFallbackPct` بين Dashboard وAccountsPage.
- قرار صريح: حذف `waqf_corpus_percentage` من DB أو تفعيله في الصيغة.
- إضافة عرض `share_percentage / total` في `MyShareSummaryCards`.

### Stage 5 — حواجز انحدار
- اختبار تكامل يقارن قيم البطاقات الموحَّدة بين الدور والصفحة لنفس السنة المالية.
- إضافة فحص `lib/diagnostics` يتأكد أن `available_amount` و`my_share` في beneficiary RPC = ما يحسبه admin RPC لنفس المستفيد.

---

## تفاصيل تقنية (للمراجعة الفنية)

**ملفات المصادر الأساسية المتأثرة:**
- `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts`
- `src/hooks/page/admin/dashboard/useAdminDashboardData.ts`
- `src/hooks/page/admin/dashboard/useAccountantDashboardData.ts`
- `src/hooks/page/admin/dashboard/useAdminDashboardPage.ts`
- `src/hooks/page/beneficiary/useMySharePage.ts`
- `src/hooks/domain/financial/useMyShare.ts`
- `src/hooks/page/beneficiary/useCarryforwardData.ts`
- `src/components/dashboard/widgets/DashboardAlerts.tsx`
- `src/components/dashboard/kpi/CollectionSummaryCard.tsx`
- `src/components/beneficiary/MyShareSummaryCards.tsx`
- `src/components/beneficiary/CarryforwardSummaryCards.tsx`
- `src/pages/dashboard/AdminDashboard.tsx`
- `src/utils/financial/activeYearFinancials.ts` + `closedYearFinancials.ts`
- `src/utils/distribution/distributionSummary.ts`

**Migrations مرتقبة:**
- تعديل `get_dashboard_full_summary` لإضافة `GREATEST(0,...)` على `available_amount` و`remaining_balance` وإعادة `prev_corpus_previous` و`prev_vat` و`prev_zakat`.
- (اختياري) قراءة `accounts.net_after_zakat` بدل إعادة الحساب لو ثبت اختلاف.

**ملاحظة:** التنفيذ لم يبدأ. هذه الخطة للمراجعة فقط. الأولوية Stage 1 (أمن) ثم Stage 2 (أرقام مرئية خاطئة). Stage 3 يحتاج migration وقد يؤثر على snapshots السنوات المقفلة — يُنفَّذ بحذر مع نسخة قاعدة بيانات قبل التطبيق.