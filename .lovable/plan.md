
# خطة شاملة متكاملة — توحيد المنطق المالي + تدقيق البطاقات والوظائف

## الهدف
1. تنفيذ **Stage 3** المؤجل: توحيد `available_amount` و`net_after_zakat` وإصلاح YoY مع حماية snapshots السنوات المقفلة.
2. **تدقيق عددي شامل** لكل بطاقة في 3 لوحات (ناظر/مستفيد/محاسب) مقارنةً بمصدر البيانات (RPC/Metrics/DB).
3. **تدقيق وظيفي** لكل زر/تبويب/صفحة فرعية في 3 لوحات للتأكد من سلامة التكامل.

---

## المرحلة 1 — توحيد المنطق المالي (Stage 3 المؤجل) 🔴 حرج

### 1.1 توحيد `available_amount` و`remaining_balance`
**المشكلة:** نفس السنة لها 3 قيم مختلفة:
- admin RPC: يسمح بقيمة سالبة
- beneficiary RPC: `GREATEST(0, ...)`
- `closedYearFinancials`: `Math.max(0, ...)`

**الحل (migration):**
- في `get_dashboard_full_summary`: تطبيق `GREATEST(0, waqf_revenue - waqf_corpus_manual)` على `available_amount` و`remaining_balance`.
- إضافة عمود مساعد `available_amount_raw` (بدون GREATEST) للاستخدام الإداري عند الحاجة لرؤية العجز.
- **حماية snapshots:** التعديل يطبَّق فقط على السنوات النشطة (الحساب الديناميكي). السنوات المقفلة تقرأ من `accounts` كما هي.

### 1.2 توحيد `net_after_zakat`
**المشكلة:** يُحسب في RPC للنشطة، ويُقرأ من `account.net_after_zakat` في المقفلة → احتمال انحراف.

**الحل:**
- توحيد قراءة `net_after_zakat` من نفس المصدر في كل من `activeYearFinancials.ts` و`closedYearFinancials.ts`.
- التأكد من أن صيغة `net_after_expenses - vat - zakat` مطبقة بنفس الترتيب في الجهتين.

### 1.3 إصلاح YoY (Year-over-Year)
**المشكلة:** `prevNetAfterExpenses` يتجاهل `corpus_previous`/`vat`/`zakat` → نسبة النمو غير صحيحة.

**الحل:**
- تعديل `get_dashboard_full_summary` لإرجاع `prev_corpus_previous`, `prev_vat`, `prev_zakat`, `prev_net_after_zakat`.
- تحديث `useAdminDashboardStats.ts` ليستخدم `prev_net_after_zakat` مباشرة في حساب YoY بدلاً من `prevNetAfterExpenses`.

### 1.4 توحيد نطاق `paidAdvancesTotal` و`carryforward_balance`
- توحيد الفترة الزمنية (السنة المالية الحالية) في كلا الحقلين عبر جميع الـhooks.

### 1.5 إزالة `waqf_corpus_percentage` غير المستخدم
- إما حذفه من DB/RPCs أو ربطه فعلياً بحساب `waqf_corpus_manual` كنسبة من الإيراد.

---

## المرحلة 2 — التدقيق العددي الشامل للبطاقات 🟡 توثيق+فحص

### 2.1 لوحة الناظر (Admin Dashboard)
لكل بطاقة، توثيق:
- الاسم المعروض
- المصدر (RPC / hook / حساب محلي)
- الصيغة المتوقعة
- مقارنة مع جدول `accounts` للسنة المقفلة و RPC للسنة النشطة

البطاقات المستهدفة:
- إجمالي الإيرادات / إجمالي المصروفات
- ضريبة القيمة المضافة / الزكاة
- ريع الوقف / المتاح للتوزيع
- التدفق النقدي الصافي (admin-only)
- إجمالي التحصيل / المتأخرات / المعلقة
- YoY لكل مؤشر
- تنبيهات `DashboardAlerts`

### 2.2 لوحة المستفيد (Beneficiary Dashboard)
- حصتي (`my_share`) — مقارنة مع `share_percentage × available_amount`
- المستلم فعلياً (`total_received`) — مقارنة مع مجموع `distributions.status='paid'`
- السلف المستلمة (`paidAdvancesTotal`)
- المرحّل من السنة السابقة (`carryforward_balance`)
- صافي مستحقي = `my_share - advances - carryforward`
- حماية `Math.max(0, ...)`

### 2.3 لوحة المحاسب (Accountant Dashboard)
- التأكد من إخفاء بطاقات الإفصاح (Waqf Revenue, Net Cash Flow)
- بطاقة الفواتير المتأخرة (`overdue_count`) vs المعلقة (`pending_count`)
- مقارنة `pendingInvoicesCount` بعد فلتر `due_date >= today`
- التحقق من عدم الازدواج في عدّ الفواتير

### 2.4 أداة تحقق آلية (diagnostic)
- إنشاء `src/lib/diagnostics/cardConsistencyCheck.ts`:
  - يقارن قيم بطاقات الإدمن مع بطاقات المستفيد لنفس السنة المالية ونفس المستفيد.
  - يُسجّل أي انحراف في `logger.warn` مع تفاصيل الفروقات.
- إضافة zaktest في `src/test/integration/dashboardConsistency.test.ts`.

---

## المرحلة 3 — تدقيق الوظائف والأزرار والتبويبات 🟢 شامل

### 3.1 لوحة الناظر — كل الصفحات الفرعية
- `/dashboard` — التحقق من أزرار التنقل السريع
- `/dashboard/properties` — CRUD العقارات + الوحدات
- `/dashboard/contracts` — العقود (إنشاء/تجديد/إنهاء/PII persistence)
- `/dashboard/invoices` — الفواتير + ZATCA (إصدار/إلغاء/تحميل XML)
- `/dashboard/expenses` — المصروفات + سندات الصرف
- `/dashboard/distributions` — التوزيعات (execute_distribution)
- `/dashboard/fiscal-years` — إقفال/إعادة فتح/snapshots
- `/dashboard/users` — إدارة الأدوار
- `/dashboard/settings` — إعدادات النظام
- `/dashboard/audit-log` — سجل المراجعة
- `/dashboard/reports` — التقارير السنوية
- `/dashboard/bylaws` — اللوائح

### 3.2 لوحة المستفيد — كل الصفحات
- `/dashboard/my-share` — التحقق من ربط الأرقام بـRPC
- `/dashboard/my-distributions` — التحقق من الفلترة حسب beneficiary_id
- `/dashboard/advance-request` — تقديم طلب سلفة + حدود `advance_limit_percentage`
- `/dashboard/disclosure` — الإفصاحات المنشورة فقط

### 3.3 لوحة المحاسب
- التأكد من إخفاء صفحات الإفصاح والإعدادات الإدارية
- التحقق من صلاحيات CRUD المالية فقط
- اختبار `accountant-dashboard-filtering` بفعالية

### 3.4 فحص التكامل عبر sub-agent
- استخدام `acp_subagent--explore` ثلاث مرات متوازية لمسح كامل لكل لوحة وتوثيق:
  - الأزرار غير المربوطة (dead buttons)
  - التبويبات بدون محتوى
  - الروابط المعطلة
  - الـqueries المكررة (نفس البيانات تُجلب مرتين)

---

## المرحلة 4 — التحقق النهائي والاختبارات

- تشغيل `vitest` على كامل `src/hooks/domain/financial` و`src/test/integration/`
- تشغيل migration على Test أولاً والتحقق من snapshots السنوات المقفلة (يجب ألا تتغير قيمها)
- query عيّنة من DB قبل/بعد لكل سنة مقفلة للتأكد من عدم تأثرها
- توثيق نتائج التدقيق في `.lovable/audit-report-2026-06-03.md`

---

## الملفات المتأثرة

### Migration
- `supabase/migrations/*_unify_financial_logic.sql` (تعديل `get_dashboard_full_summary` فقط)

### Frontend
- `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts` (YoY)
- `src/utils/financial/activeYearFinancials.ts` (توحيد)
- `src/utils/financial/closedYearFinancials.ts` (توحيد)
- `src/hooks/domain/financial/useMyShare.ts` (تنظيف)
- `src/hooks/domain/financial/useCarryforwardData.ts` (توحيد نطاق)

### جديد
- `src/lib/diagnostics/cardConsistencyCheck.ts`
- `src/test/integration/dashboardConsistency.test.ts`
- `.lovable/audit-report-2026-06-03.md`

---

## ترتيب التنفيذ المقترح
1. **المرحلة 1** أولاً (migration + توحيد utils) — يحل جذر التناقضات
2. **المرحلة 2** فوراً بعدها (التحقق العددي) — لإثبات صحة المرحلة 1
3. **المرحلة 3** بعد ذلك (sub-agents بالتوازي) — فحص شامل
4. **المرحلة 4** أخيراً (اختبارات + توثيق)

## ضمانات الأمان
- لا تعديل على `auth/`, `client.ts`, `types.ts`, `config.toml`
- snapshot السنوات المقفلة محمي (تعديل RPC على السنوات النشطة فقط)
- جميع تغييرات DB عبر migration واحد مراجَع
- اختبار قبل/بعد لكل سنة مقفلة موجودة

---

## ✅ Phase 1 (Stage 3) — تم التنفيذ — 2026-06-03

### تغييرات DB
- Migration `get_dashboard_full_summary`:
  - تطبيق `GREATEST(0, ...)` على `available_amount` و`remaining_balance` في كل الفروع (نشطة/مقفلة/بدون حساب)
  - حقول جديدة في `totals`: `available_amount_raw`, `remaining_balance_raw` (للاطلاع الإداري على العجز)
  - حقول جديدة في `yoy`: `prev_corpus_previous`, `prev_vat`, `prev_zakat`, `prev_net_after_zakat`, `prev_has_account`
- **حماية snapshots**: لم يُمس جدول `accounts` ولا السنوات المقفلة المخزَّنة. التعديل عرض RPC فقط.

### تغييرات Frontend
- `src/types/financial/dashboard.ts`: إضافة الحقول الجديدة لـ `AggregatedYoY`
- `src/lib/api/schemas/dashboardSummary.ts`: تحديث Zod schema
- `src/hooks/data/financial/dashboard/useDashboardSummary.ts`: استخدام `prev_net_after_zakat` الدقيق من snapshot عند توفره

### اختبارات
- 317/317 اختباراً نجحت في `src/hooks/domain/financial` + `src/utils/financial`
- `closedYearFinancials` و`activeYearFinancials` لم تتطلب تعديلاً لأنها بالفعل تطبق `Math.max(0)` محلياً — الآن RPC متوافق معها

### المتبقي (Phase 2-4)
- Phase 2: أداة تحقق آلية + integration test
- Phase 3: تدقيق وظيفي عبر sub-agents
- Phase 4: توثيق ختامي
