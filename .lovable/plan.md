

# خطة تحويل dashboard-summary إلى RPC مُجمّعة

## الوضع الحالي (بعد الفحص الفعلي)

- Edge Function تجلب **14 استعلاماً متوازياً** تُرجع آلاف الصفوف خام (عقود، دخل، مصروفات، فواتير، وحدات...)
- العميل يُعيد حساب كل شيء عبر `useComputedFinancials` + `computeCollectionSummary` + `computeOccupancy`
- **يوجد بالفعل** دالة `get_dashboard_kpis` و عرض `v_fiscal_year_summary` في قاعدة البيانات — لكنهما **غير مستخدمتين** من الـ Edge Function

## خطة التنفيذ

### المرحلة 1: إنشاء RPC `get_dashboard_full_summary(p_fiscal_year_id uuid)`

دالة PL/pgSQL واحدة تُرجع `jsonb` شامل يحتوي:

```text
{
  totals: { total_income, total_expenses, net_after_expenses,
            contractual_revenue, grand_total, vat_amount, zakat_amount,
            net_after_vat, net_after_zakat, admin_share, waqif_share,
            waqf_revenue, waqf_corpus_manual, waqf_corpus_previous,
            distributions_amount, available_amount, remaining_balance },
  collection: { paid_count, partial_count, unpaid_count, overdue_count,
                total, percentage, total_collected, total_expected },
  occupancy: { rented_units, total_units, rate },
  counts: { properties, active_contracts, beneficiaries, pending_advances,
            expiring_contracts, orphaned_contracts, unsubmitted_zatca },
  monthly_data: [ { month, income, expenses } ],
  expense_types: [ { name, value } ],
  yoy: { prev_fy_id, prev_label, prev_income, prev_expenses, has_prev },
  fiscal_years: [ { id, label, status, start_date, end_date, published } ],
  settings: { admin_share_percentage, waqif_share_percentage, ... },
  beneficiaries: [ { id, name, share_percentage, user_id } ],
  fiscal_year_status, fiscal_year_label, is_closed
}
```

**منطق حرج يُنسخ بدقة من الكود:**

1. **السنة المالية**: `NULL` = السنة النشطة. `'all'` يُعالج بإرسال `NULL` من Edge Function مع علم خاص
2. **الحسابات المالية** — 3 مسارات:
   - **سنة مقفلة + حساب ختامي**: قراءة `admin_share`, `waqif_share`, `waqf_revenue` من جدول `accounts` (كما في `closedYearFinancials.ts`)
   - **سنة نشطة + حساب ختامي**: حساب حي مع تصفير الحصص (`admin_share=0`, `waqif_share=0`, `waqf_revenue=0` — كما في `activeYearFinancials.ts`)
   - **بدون حساب ختامي**: حساب كامل من الصفر باستخدام النسب من `app_settings` (كما في `calculateFinancials`)
3. **التحصيل**: `SUM/COUNT` مع `FILTER(WHERE status IN ('paid','partially_paid'))` على `payment_invoices` للعقود النشطة/المنتهية فقط، مع شرط `due_date <= NOW()`
4. **الإشغال**: `COUNT(DISTINCT unit_id)` من العقود النشطة / إجمالي الوحدات
5. **البيانات الشهرية**: `GROUP BY date_trunc('month', date)` على `income` و `expenses`
6. **YoY**: استعلام فرعي على السنة السابقة (ترتيب `start_date`)
7. **الإعدادات + المستفيدون**: `jsonb_object_agg` و `jsonb_agg`

### المرحلة 2: تعديل Edge Function `dashboard-summary/index.ts`

استبدال 14 استعلاماً بـ **4 فقط**:

| # | الاستعلام | الغرض | الحجم |
|---|-----------|-------|-------|
| 1 | `rpc('get_dashboard_full_summary')` | كل الأرقام المُجمّعة | ~5KB |
| 2 | `payment_invoices` (حقول محدودة) `LIMIT 500` | CollectionHeatmap | ~50 صف |
| 3 | `advance_requests` (pending) `LIMIT 20` | PendingActionsTable | ~20 صف |
| 4 | `contracts` (آخر 5) `LIMIT 5` | RecentContractsCard | 5 صفوف |

- فواتير ZATCA غير المرسلة تُحسب من الاستعلام #2 (فلترة `zatca_status`)
- المصادقة والتحقق من الدور و rate limit تبقى كما هي

### المرحلة 3: تعديل Frontend

#### 3.1 `useDashboardSummary.ts`
- تغيير `DashboardSummaryResponse` للشكل الجديد: `aggregated` (من RPC) + `heatmap_invoices` + `pending_advances` + `recent_contracts`
- **إزالة كل cache priming** — تم التحقق أن كل صفحة فرعية لديها `useQuery` مستقل

#### 3.2 `useAdminDashboardData.ts`
- إزالة `useComputedFinancials` — الأرقام جاهزة من `summary.aggregated.totals`
- إزالة حسابات `contractualRevenue`, `expiringContracts`, `pendingAdvancesCount` — جاهزة في `aggregated.counts`
- القراءة مباشرة من الأرقام المُجمّعة

#### 3.3 `useAdminDashboardStats.ts`
- إزالة `computeCollectionSummary` و `computeOccupancy` — جاهزة من RPC
- بناء `stats` و `kpis` من أرقام جاهزة

#### 3.4 `AdminDashboard.tsx`
- تمرير `summary.heatmap_invoices` لـ CollectionHeatmap
- تمرير `summary.pending_advances` لـ PendingActionsTable
- تمرير `summary.recent_contracts` لـ RecentContractsCard
- تمرير `summary.aggregated.fiscal_years` لـ YearComparisonCard

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| Migration جديد | إنشاء `get_dashboard_full_summary(uuid)` |
| `supabase/functions/dashboard-summary/index.ts` | 4 استعلامات بدل 14 |
| `src/hooks/data/financial/useDashboardSummary.ts` | نوع جديد + إزالة cache priming |
| `src/hooks/page/useAdminDashboardData.ts` | تبسيط جذري |
| `src/hooks/page/useAdminDashboardStats.ts` | أرقام جاهزة من RPC |
| `src/pages/dashboard/AdminDashboard.tsx` | تعديل props |

## الملفات المحمية

`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`, `client.ts`, `types.ts`, `.env`, `config.toml`

## النتيجة المتوقعة

- **وقت الاستجابة**: 8+ ثوانٍ → **< 500ms**
- **حجم البيانات**: عدة ميغابايت → **< 15KB**
- **حمل المتصفح**: إزالة كل `reduce/filter/useMemo` الحسابي الثقيل

