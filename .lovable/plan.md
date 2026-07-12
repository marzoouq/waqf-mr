# خطة موحّدة — دور دعم فني + منظومة تذاكر مفصولة + وضع صيانة + تفعيل مركز التشخيص الكامل

## 0) قراءة الوضع الحالي (تم التحقق)
- توجد بالفعل جداول `support_tickets` (15 عمود) و `support_ticket_replies` (6 أعمدة) في قاعدة البيانات — سنبني عليها لا نستبدلها.
- توجد بالفعل خدمات: `useSupportTickets`, `useSupportAnalytics`, `supportService`, `supportKeys`.
- جدول `messages` منفصل ويُستخدم للمحادثات الإدارية (ناظر ↔ مستخدم) — سيبقى كما هو للناظر فقط.
- الفصل الحالي **موجود على مستوى الجداول أصلاً**: التذاكر = `support_tickets`، الرسائل الإدارية = `messages`. المشكلة أن دور "الدعم" غير موجود ولا توجد لوحة مخصصة له.

---

## 1) دور "الدعم الفني" (`support`) — دور جديد

### قاعدة البيانات (Migration 1)
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
```

### طبقة الصلاحيات
- `src/constants/roles.ts`: إضافة `SUPPORT_ROLES = ['support', 'admin'] as const`.
- `src/constants/routeRoles.ts`: قواعد لمسارات `/support/*`.
- **لا يُمنح** دور الدعم أي وصول للبيانات المالية أو العقود أو المستفيدين.

### الوصول المسموح لدور `support`
| المورد | RLS |
|---|---|
| `support_tickets` (كل التذاكر) | SELECT/UPDATE |
| `support_ticket_replies` | SELECT/INSERT/UPDATE |
| `messages` (الإدارية) | **محجوب** — للناظر فقط |
| `app_settings` (`maintenance_*` فقط) | UPDATE |
| `access_log` (`client_error` فقط) | SELECT + DELETE للتنظيف |
| باقي الجداول المالية | **محجوب** |

### RLS (Migration 2)
- سياسات جديدة على `support_tickets` و `support_ticket_replies` تسمح بـ `has_role(auth.uid(), 'support')`.
- سياسة UPDATE على `app_settings` مقيّدة بمفاتيح `maintenance_mode` و `maintenance_message` فقط لدور support.
- سياسة SELECT/DELETE على `access_log` لدور support مقيّدة بـ `event_type = 'client_error'`.

---

## 2) لوحة تحكم الدعم الفني `/support`

مسار رئيسي محمي بـ `pr(SUPPORT_ROLES, ...)` (يشمل admin كي لا يفقد الوصول).

```
/support                       — نظرة عامة (KPIs: تذاكر مفتوحة، متوسط زمن الرد، تنبيهات حرجة)
/support/tickets               — قائمة/تفاصيل التذاكر + الردود (يستخدم support_tickets الحالي)
/support/diagnostics           — مركز التشخيص الكامل بـ 14 تبويب
/support/maintenance           — وضع الصيانة
/support/errors                — الأخطاء الحيّة (client_error) + تصدير
```

### الملفات الجديدة
- `src/routes/supportRoutes.tsx`
- `src/pages/support/SupportDashboard.tsx` — نظرة عامة
- `src/pages/support/SupportTicketsPage.tsx` — يعيد استخدام `useSupportTickets` و `supportService` الحاليَين.
- `src/pages/support/SupportDiagnosticsPage.tsx` — يستضيف نفس `SystemDiagnosticsPage` (لا نسخ).
- `src/pages/support/SupportMaintenancePage.tsx`
- `src/pages/support/SupportErrorsPage.tsx`

### تفعيل التنقل
- إضافة قائمة جانبية خاصة بدور `support` تعرض هذه المسارات فقط.
- عند تسجيل الدخول بدور `support` → توجيه إلى `/support` (تعديل منطق التوجيه بعد الدخول فقط، دون المساس بـ `AuthContext`).

---

## 3) فصل رسائل الدعم عن رسائل الناظر — **بلا تعديل schema**

الفصل موجود على مستوى الجداول. المطلوب فقط:
- `MessagesPage.tsx` (لوحة الناظر) — يقرأ من `messages` فقط (كما هو الآن).
- `SupportDashboardPage.tsx` الحالي (المسار `/dashboard/support`) — يبقى للناظر (رؤية شاملة).
- الصفحة الجديدة `/support/tickets` — لدور `support` فقط، تقرأ من `support_tickets`.
- مستخدمو beneficiary/waqif: صفحتهم `SupportPage` تنشئ تذاكر في `support_tickets` (كما هو الآن).

**لا حاجة لإضافة عمود `channel` — الجداول مفصولة أصلاً.**

---

## 4) وضع الصيانة

### التخزين (Migration 3)
```sql
INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'النظام تحت الصيانة، سنعود قريباً بإذن الله'),
  ('maintenance_started_at', '')
ON CONFLICT (key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
```

### السلوك
- `useMaintenanceMode()` جديد يقرأ من `useAppSettings` + realtime channel على `app_settings`.
- في `src/routes/ProtectedRouteHelper.tsx`: قبل تمرير `children`، إذا `maintenance_mode='true'` والدور ∉ {admin, support} → `<Navigate to="/maintenance" replace />`.
- `admin` و `support` يدخلان بشكل طبيعي مع `MaintenanceBanner` علوي.
- عند إيقاف الصيانة → invalidate cache + إعادة تحميل تلقائية للجلسات النشطة.

### المكوّنات الجديدة
| ملف | الغرض |
|---|---|
| `src/pages/MaintenancePage.tsx` | شاشة عامة (شعار + رسالة + وقت البدء + زر تسجيل خروج) |
| `src/components/common/MaintenanceBanner.tsx` | بانر علوي لـ admin/support |
| `src/hooks/application/useMaintenanceMode.ts` | قراءة/تبديل + realtime |
| `src/components/diagnostics/MaintenanceModePanel.tsx` | Switch + Textarea + عرض من فعّل ومتى |

### الأمان
- تعديل مفاتيح `maintenance_*` مسموح لـ admin + support فقط (Migration 2).
- لا تعديل على `AuthContext` أو `ProtectedRoute` — الحارس مضاف في `ProtectedRouteHelper` فقط.

---

## 5) مركز التشخيص — التبويبات الـ 14 وتفعيلها الكامل

**لا حذف** — كل المكونات موجودة. المطلوب إعادة تنظيم `SystemDiagnosticsPage` لعرض 14 تبويب واضح وتفعيل الأزرار الخاملة:

| # | التبويب | المكوّن | الحالة | العمل |
|---|---|---|---|---|
| 1 | نظرة عامة | `HealthSummaryCard` + `ThreatLevelIndicator` + KPIs | ✅ | تجميع في تبويب واحد |
| 2 | 🛠 التوصيات والإصلاحات | `ActionsAndFixesPanel` | ✅ يعمل | إضافة 3 إصلاحات جديدة (أدناه) |
| 3 | 🛡 الأمان والاختراق | `SecurityIntrusionPanel` | ✅ | — |
| 4 | ⚠️ الأخطاء الحيّة | `RuntimeErrorsPanel` | ✅ | تفعيل زر تصدير JSON |
| 5 | 💾 أداء قاعدة البيانات | `DbPerformancePanel` | ⚠️ يحتاج مصدر | ربط بـ Edge Function `diagnostics-db-perf` |
| 6 | ⚡ Edge Functions | `EdgeFunctionsPanel` | ⚠️ | ربط زر "اختبار latency" بـ Edge Function `diagnostics-edge-ping` |
| 7 | الفحوصات | `DiagnosticsChecksGrid` | ✅ 50 فحص | — |
| 8 | سجل Backend | `BackendLogTable` | ✅ | — |
| 9 | خريطة التطبيق | `AppMapTree` | ✅ | — |
| 10 | التفاعلات | `InteractionsTable` | ✅ | — |
| 11 | الأداء الحي | **جديد** `LivePerformancePanel` | ➕ | FPS + Memory + Network live via `PerformanceObserver` |
| 12 | السجل والتصدير | `RunHistoryList` + زر تصدير JSON/PDF جديد | ⚠️ | تفعيل التصدير |
| 13 | التنبيهات الحرجة | `CriticalAlertsBanner` (منقول للتبويب) | ✅ | — |
| 14 | وضع الصيانة | `MaintenanceModePanel` (جديد) | ➕ | — |

### إصلاحات fixActions جديدة
تُضاف إلى `src/lib/diagnostics/fixActions.ts`:
- `purgeOldClientErrors()` — DELETE من `access_log` حيث `event_type='client_error' AND created_at < now() - '30 days'`.
- `testAllEdgeFunctions()` — يستدعي `diagnostics-edge-ping` ويرجع latency لكل الـ 11 دالة.
- `exportDiagnosticsReport()` — يجمع كل نتائج آخر تشغيل + معلومات النظام في JSON قابل للتنزيل.

---

## 6) Edge Functions جديدة (2)

### `supabase/functions/diagnostics-db-perf/index.ts`
- `getUser()` → تحقق دور admin أو support من `user_roles`.
- استعلام `pg_stat_statements` عبر service_role مقيّد بـ schemas مسموحة.
- Zod validation، CORS، fail-closed.

### `supabase/functions/diagnostics-edge-ping/index.ts`
- `getUser()` → تحقق admin/support.
- fetch متوازٍ لـ 11 دالة (health-check pattern) مع قياس latency.
- إرجاع `[{ name, ok, latencyMs, statusCode }]`.

كلاهما `verify_jwt = false` (كما هو معتاد في المشروع).

---

## 7) قاعدة البيانات — Migrations (3 فقط)

1. **Migration 1**: `ALTER TYPE app_role ADD VALUE 'support'`.
2. **Migration 2**: سياسات RLS لدور support على `support_tickets`, `support_ticket_replies`, `app_settings`, `access_log`.
3. **Migration 3**: مفاتيح الصيانة في `app_settings` + `ALTER PUBLICATION supabase_realtime ADD TABLE app_settings`.

**لا تعديل** على `messages`، `support_tickets` (schema)، أو أي جدول مالي.

---

## 8) الملفات المتأثرة

### جديدة (14 ملف)
- `src/routes/supportRoutes.tsx`
- `src/pages/support/SupportDashboard.tsx`
- `src/pages/support/SupportTicketsPage.tsx`
- `src/pages/support/SupportDiagnosticsPage.tsx`
- `src/pages/support/SupportMaintenancePage.tsx`
- `src/pages/support/SupportErrorsPage.tsx`
- `src/pages/MaintenancePage.tsx`
- `src/components/common/MaintenanceBanner.tsx`
- `src/components/diagnostics/MaintenanceModePanel.tsx`
- `src/components/diagnostics/LivePerformancePanel.tsx`
- `src/hooks/application/useMaintenanceMode.ts`
- `src/components/support/SupportSidebar.tsx`
- `supabase/functions/diagnostics-db-perf/index.ts`
- `supabase/functions/diagnostics-edge-ping/index.ts`

### تعديل (10 ملفات)
- `src/constants/roles.ts` — `SUPPORT_ROLES`
- `src/constants/routeRoles.ts` — قواعد `/support/*`
- `src/routes/ProtectedRouteHelper.tsx` — حارس الصيانة (بدون تعديل ProtectedRoute نفسه)
- `src/app/router.tsx` — تسجيل supportRoutes + `/maintenance`
- `src/app/root-layout.tsx` — عرض `MaintenanceBanner` لدور admin/support
- `src/pages/dashboard/SystemDiagnosticsPage.tsx` — إعادة تنظيم إلى 14 تبويب + إضافة الجديدَين
- `src/components/diagnostics/DiagnosticsToolbar.tsx` — زر التصدير
- `src/components/diagnostics/EdgeFunctionsPanel.tsx` — ربط ping
- `src/components/diagnostics/DbPerformancePanel.tsx` — ربط db-perf
- `src/lib/diagnostics/fixActions.ts` — 3 إصلاحات جديدة

---

## 9) اختبارات
- **Vitest**: `useMaintenanceMode`, حارس التوجيه، `fixActions` الجديدة.
- **Playwright E2E**:
  - support يدخل ويرى فقط تذاكر `support_tickets` (لا `messages`).
  - admin يفعّل الصيانة → beneficiary يُحوّل لـ `/maintenance` بينما admin/support يدخلان.
  - زر تصدير التشخيص يُنزّل JSON.

---

## 10) خارج النطاق (لن يُفعل)
- لا تعديل على `AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`, `config.toml`, `client.ts`, `types.ts`, `.env`.
- لا تعديل schema على `support_tickets` أو `messages`.
- لا منح دور `support` أي صلاحية على البيانات المالية.
- لا نسخ منطق `SystemDiagnosticsPage` — يُعاد استخدامه.

---

## 11) ترتيب التنفيذ
1. Migration 1 (enum) → 2 (RLS) → 3 (settings + realtime).
2. `roles.ts` + `routeRoles.ts` + `useMaintenanceMode`.
3. `MaintenancePage` + `MaintenanceBanner` + حارس التوجيه في `ProtectedRouteHelper`.
4. `MaintenanceModePanel` + تبويب الصيانة داخل `SystemDiagnosticsPage`.
5. Edge Functions (`diagnostics-db-perf` و `diagnostics-edge-ping`).
6. تفعيل الأزرار: `DbPerformancePanel`, `EdgeFunctionsPanel`, `RuntimeErrorsPanel` (تصدير), fixActions الجديدة.
7. تبويب "الأداء الحي" `LivePerformancePanel`.
8. لوحة `/support` بكامل صفحاتها.
9. اختبارات + Playwright.

هل نبدأ التنفيذ بهذا الترتيب؟