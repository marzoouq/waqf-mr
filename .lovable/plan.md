

# خطة تحسين الأداء — المرحلة السادسة

5 أولويات، ~10 ملفات، 1 مكون جديد، 0 migrations.

---

## الأولوية 1: تسريع `dashboard-summary` Edge Function

**الوضع الحالي:** مرحلتان متسلسلتان — `auth+body` (سطر 45-48) ثم `roles+rateLimit` (سطر 59-62) — قبل الاستعلامات الأربعة.

**التغييرات:**
1. **دمج الثلاثة في `Promise.all` واحد:** `getUser()` + `req.json()` + `user_roles` + `check_rate_limit` كلها بالتوازي. نتحقق من نتائج auth أولاً قبل استخدام البيانات.
2. **فصل `heatmap_invoices` و `recent_contracts`** من الدالة — إنشاء hook عميل `useDashboardSecondary` يجلبها مباشرة من Supabase بعد تحميل KPIs.

**الملفات:**
- `supabase/functions/dashboard-summary/index.ts` — دمج Promise.all + إزالة heatmap/recent_contracts
- `src/hooks/data/financial/useDashboardSummary.ts` — إضافة `useDashboardSecondary` + تعديل الأنواع
- `src/pages/dashboard/AdminDashboard.tsx` — استخدام `useDashboardSecondary` لتمرير البيانات للمكونات المعنية

**الأثر:** تقليل زمن الاستجابة من ~1.9s إلى ~0.8-1s

---

## الأولوية 2: إصلاح عداد الرسائل غير المقروءة

**الوضع الحالي:** `useUnreadMessages` يعمل في نسختين (Sidebar سطر 31 + BottomNav سطر 14)، مع `refetchInterval: 60_000` وretries افتراضية تُولّد طلبات HEAD فاشلة.

**التغييرات:**
1. في `useUnreadMessages.ts`: إضافة `retry: false`، حذف `refetchInterval`
2. رفع الاستدعاء إلى `DashboardLayout.tsx` (سطر 34) وتمرير `unreadCount` كـ prop لـ `SidebarContent` و`BottomNav`
3. إضافة `'messages'` لقائمة جداول `useDashboardRealtime` في `AdminDashboard.tsx` (سطر 38)

**الملفات:**
- `src/hooks/data/messaging/useUnreadMessages.ts`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/Sidebar.tsx` — حذف `useUnreadMessages`، استقبال `unreadCount` من props
- `src/components/layout/BottomNav.tsx` — حذف `useUnreadMessages`، استقبال `unreadCount` من props

---

## الأولوية 3: تضييق Realtime invalidation

**الوضع الحالي:** `flushInvalidations` (سطر 37-42 في `useDashboardRealtime.ts`) يُبطل بـ `queryKey: [table], exact: false` — يشمل كل الاستعلامات المرتبطة.

**التغييرات:**
1. إضافة معامل اختياري `extraKeys?: string[][]` لـ `useDashboardRealtime`
2. في `flushInvalidations`: إبطال `extraKeys` أيضاً عند أي تغيير
3. في `AdminDashboard.tsx`: تمرير `extraKeys: [['dashboard-summary']]`

**الملفات:**
- `src/hooks/ui/useDashboardRealtime.ts`
- `src/pages/dashboard/AdminDashboard.tsx`

---

## الأولوية 4: ViewportRender للأقسام الثقيلة

**الوضع الحالي:** `DeferredRender` بتأخيرات 0-400ms (سطور 91-133) يُركّب كل الأقسام بسرعة بغض النظر عن موقعها.

**التغييرات:**
1. إنشاء `ViewportRender` — يستخدم `IntersectionObserver` مع `rootMargin: '200px'` + placeholder بارتفاع `minHeight`
2. استبدال `DeferredRender` في AdminDashboard لـ:
   - `CollectionHeatmap` (سطر 91)
   - `DashboardCharts` (سطر 109)
   - `YearComparisonCard` (سطر 119)
   - `PagePerformanceCard` (سطر 124)
3. إبقاء المكونات العلوية (Stats, KPIs, Alerts, FiscalYear, QuickActions, CollectionSummary) بدون تأخير

**الملفات:**
- `src/components/common/ViewportRender.tsx` (جديد)
- `src/pages/dashboard/AdminDashboard.tsx`

---

## الأولوية 5: useMemo في useWaqfInfo + useSetting في Sidebar

**الوضع الحالي:** `useWaqfInfo` (سطر 142-158 في `useAppSettings.ts`) يُنشئ كائن جديد كل render. `Sidebar` يستدعي `useWaqfInfo` كاملاً رغم حاجته لحقلين فقط.

**التغييرات:**
1. تغليف كائن `info` في `useWaqfInfo` بـ `useMemo` يعتمد على `settings`
2. في `Sidebar.tsx`: استبدال `useWaqfInfo()` بـ `useSetting('waqf_name')` + `useSetting('waqf_logo_url')`

**الملفات:**
- `src/hooks/data/settings/useAppSettings.ts`
- `src/components/layout/Sidebar.tsx`

---

## ملخص التنفيذ

| # | الإجراء | الملفات | الأثر |
|---|---------|---------|-------|
| 1 | تسريع Edge Function + فصل بيانات ثقيلة | 3 | عالي |
| 2 | إصلاح useUnreadMessages (توحيد + إزالة polling) | 4 | متوسط |
| 3 | تضييق Realtime invalidation بـ extraKeys | 2 | متوسط |
| 4 | ViewportRender بدل DeferredRender | 2 (1 جديد) | عالي |
| 5 | useMemo في useWaqfInfo + useSetting في Sidebar | 2 | منخفض |

**إجمالي:** 0 migrations، ~10 ملفات، 1 مكون جديد.

