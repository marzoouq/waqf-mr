# نظام تنبيهات أخطاء Realtime والأخطاء الحرجة

الهدف: رصد أخطاء Realtime (مثل `cannot add postgres_changes callbacks after subscribe()`، `CHANNEL_ERROR`، `TIMED_OUT`) لحظة حدوثها، وإرسال تنبيه فوري للفريق (الناظر + الدعم الفني) داخل التطبيق وبالبريد، مع لوحة لإدارة التنبيهات.

## الوضع الحالي (تم التحقق منه)

- أخطاء العميل تُسجّل في `access_log` بنوع `client_error` عبر `reportClientError`، وتُرسل إلى Sentry إن كان مفعّلاً.
- `runtimeCollector` يلتقط `window.error` و`unhandledrejection` في sessionStorage فقط — لا يُرسل شيئاً للخادم، لذلك أخطاء الـ Realtime التي تُرمى خارج شجرة React لا تصل للسجل.
- لا يوجد أي رصد لحالات قناة Realtime (`CHANNEL_ERROR` / `TIMED_OUT`) — فقط تحذير محلي في `useCriticalAlerts`.
- لا يوجد جدول قواعد تنبيه أو سجل حوادث تنبيه؛ `notify_admins` موجودة لكنها تشترط أن يكون المُستدعي ناظراً/محاسباً (غير قابلة للاستخدام من مشغّل تلقائي) وتُشعر الناظر فقط.
- بنية البريد جاهزة: `enqueue_email` + `process-email-queue`.

## ما سيُبنى

### 1) رصد أخطاء Realtime في العميل
- `src/lib/monitoring/realtimeMonitor.ts`: أنماط تصنيف (`realtime_callback_after_subscribe`, `realtime_channel_error`, `realtime_timeout`, `realtime_closed`) ودالة `classifyRealtimeError(message)`.
- ربط `runtimeCollector` بـ `reportClientError` لأي خطأ عام يطابق أنماط Realtime — حتى ما يقع خارج ErrorBoundary يُسجَّل الآن بـ `metadata.alert_category = 'realtime'` مع اسم القناة إن توفّر.
- `withChannelStatusReport(name)`: مساعد يُستخدم في `subscribe((status) => ...)` ليبلّغ عن `CHANNEL_ERROR`/`TIMED_OUT` مباشرة، وسيُطبّق على القنوات القائمة (`useMaintenanceMode`, `useCriticalAlerts`, قنوات الرسائل).

### 2) قاعدة البيانات — قواعد وحوادث التنبيه
- جدول `alert_rules`: `code`, `name`, `match_pattern`, `event_type`, `severity`, `threshold_count`, `window_minutes`, `cooldown_minutes`, `notify_in_app`, `notify_email`, `is_active` — مع صفوف افتراضية لأنماط Realtime وارتفاع أخطاء العميل.
- جدول `alert_incidents`: `rule_code`, `severity`, `title`, `summary`, `occurrences`, `sample_metadata`, `first_seen_at`, `last_seen_at`, `status` (`open`/`acknowledged`/`resolved`), `acknowledged_by`, `resolved_by`, `notified_at`.
- GRANT + RLS: قراءة/تحديث للناظر والدعم فقط، كتابة عبر `service_role` والمشغّلات.
- مشغّل `trg_detect_alerts` على `INSERT` في `access_log`: يطابق الحدث مع القواعد النشطة، يجمع الحوادث المتشابهة داخل النافذة الزمنية (يزيد `occurrences` بدل إنشاء حادثة جديدة)، ويحترم `cooldown_minutes` قبل إعادة الإشعار.
- دالة `notify_ops(title, message, type, link)` بـ `SECURITY DEFINER` تُشعر أصحاب دور `admin` و`support` — للاستخدام من المشغّل (لا تعتمد على `auth.uid()`)، مع منع استدعائها من `anon`/`authenticated`.
- إشعار البريد: المشغّل يستدعي `enqueue_email` على طابور المعاملات برسالة عربية تحتوي القاعدة والمسار وعدد التكرارات.
- توسيع `cron_cleanup_old_notifications` ليؤرشف/يحذف الحوادث المُغلقة الأقدم من 90 يوماً.

### 3) الواجهة — تبويب «🔔 التنبيهات»
- `src/hooks/data/diagnostics/useAlertIncidents.ts` + `useAlertRules.ts` (TanStack Query + اشتراك Realtime واحد على `alert_incidents`).
- `src/components/diagnostics/AlertsPanel.tsx`: قائمة الحوادث المفتوحة (شدة، عدد التكرارات، آخر ظهور، المسار، عيّنة من الرسالة)، أزرار «إقرار» و«حل»، فلترة بالشدة/الحالة، وتصدير JSON.
- `src/components/diagnostics/AlertRulesPanel.tsx`: تعديل الحد والنافذة والتهدئة وقنوات الإشعار وتفعيل/تعطيل كل قاعدة.
- إضافة التبويب إلى `SystemDiagnosticsPage` ولوحة الدعم الفني `/support`، وشارة عدد الحوادث المفتوحة في `CriticalAlertsBanner`.

### 4) الاختبارات
- اختبارات وحدة لـ `classifyRealtimeError` وربط `runtimeCollector` بالمبلّغ.
- اختبارات للهوكس (تصفية/إقرار/حل) وحراسة الأدوار في `routeRegistry`.

## تفاصيل تقنية

- التصنيف يعتمد على نمط الرسالة في `metadata.error_message`؛ المشغّل يستخدم `ILIKE` على `match_pattern` لتجنّب regex مكلف داخل مسار الإدراج.
- التجميع (dedupe) على مستويين: نافذة 5 ثوانٍ في العميل (موجودة) + نافذة القاعدة في الخادم — لتفادي عاصفة إشعارات كما حدث سابقاً (32 حالة لخطأ واحد).
- لا تُسجَّل رسائل الأخطاء الخام في البريد كاملة؛ تُقتطع إلى 300 حرف وتُنقّى عبر `sanitizeErrorMetadata` لحماية الخصوصية.
- Sentry يبقى المسار الخارجي؛ هذا النظام هو المسار الداخلي المستقل عنه (يعمل حتى لو لم يُضبط DSN).
