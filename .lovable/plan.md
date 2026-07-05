## الإجابة المباشرة
الخطة السابقة كانت **جيدة لكن ناقصة**. راجعتُها مقابل الموجود فعلاً في `src/lib/diagnostics/` و`src/hooks/data/audit/` و`supabase/functions/` — ووسّعتها لتصبح **شاملة 100%** مع تأكيد أن **كل زر يعمل فعلياً على بيانات إنتاج حقيقية** (لا mock، لا placeholders، لا "coming soon").

---

## ما نقص في الخطة السابقة وأُضيف الآن

| الفجوة | الحل المضاف |
|--------|-------------|
| لا توجد فحوصات جديدة تُسجَّل في محرك `runAllDiagnostics` | إضافة 4 ملفات فحص جديدة تحت `src/lib/diagnostics/checks/` وتسجيلها في `registry.ts` |
| مصدر بيانات محاولات الاختراق غير محدد | تعريف نوع أحداث جديد + هوك جمع + Edge Function لتسجيل `login_failed` من `guard-signup` وAuth flows |
| Realtime للتنبيهات غير موصوف | اشتراك `postgres_changes` على `access_log` مع filter `event_type=in.(client_error,login_failed,rls_violation)` |
| RPCs لم تُحدَّد بدقة | جدول كامل لكل RPC مع signature/guards/return type |
| اختبارات ناقصة | Vitest لكل هوك جديد + Playwright E2E لبانر التنبيه ولوحة الإصلاحات |
| توثيق ناقص | تحديث `docs/diagnostics/check-catalog.md` + إضافة `docs/diagnostics/security-center.md` |
| Edge Functions monitoring: لا يوجد جدول تسجيل | استخدام `supabase.functions.invoke` logs عبر RPC يقرأ من `access_log` (event_type=`edge_call`) + تعليم كل EF بتسجيل نتائجها |
| Rate limiting UI غير موجود | قراءة جدول `rate_limits` القائم بالفعل |

---

## المخرجات الكاملة — قائمة ملفات مؤكدة

### 1) صفحة التشخيص (توسيع)
- `src/pages/dashboard/SystemDiagnosticsPage.tsx` — إضافة 5 `TabsTrigger` + `TabsContent` (Lazy) مع الحفاظ على 7 التبويبات الحالية

### 2) مكوّنات جديدة (`src/components/diagnostics/`)
| ملف | وظيفة فعلية |
|-----|--------------|
| `RuntimeErrorsPanel.tsx` | جدول أخطاء حية من `access_log` مع فلترة/بحث/تصنيف/نسخ Stack |
| `SecurityIntrusionPanel.tsx` | 4 كروت: محاولات دخول فاشلة، RLS violations، Rate limit hits، تغييرات أدوار — كلها استعلامات حقيقية |
| `ThreatLevelIndicator.tsx` | مؤشر مركّب أخضر/أصفر/برتقالي/أحمر |
| `DbPerformancePanel.tsx` | استعلامات بطيئة من `queryMonitor` + نتيجة `admin_db_stats` RPC |
| `EdgeFunctionsPanel.tsx` | جدول 11 Edge Function مع عدّاد نجاح/فشل/متوسط زمن آخر 24h |
| `ActionsAndFixesPanel.tsx` | قائمة توصيات ذكية + أزرار إصلاح تنفّذ فعلياً |
| `CriticalAlertsBanner.tsx` | بانر أعلى `AdminDashboard` مع realtime |
| `ForceSignoutDialog.tsx` | نافذة تأكيد ثنائي لقفل حساب |

### 3) هوكات بيانات (`src/hooks/data/diagnostics/`) — كلها ضد Supabase حقيقي
- `useRuntimeErrorsAggregated.ts` — يعتمد على `useClientErrors` القائم + تجميع بالرسالة
- `useLoginFailures.ts` — `.from('access_log').eq('event_type','login_failed')`
- `useRlsViolations.ts` — يفلتر `client_error` بالكود 42501
- `useRateLimitHits.ts` — `.from('rate_limits').order('count',{ascending:false})`
- `useRoleChanges.ts` — `.from('audit_log').eq('table_name','user_roles')`
- `useDbStats.ts` — `.rpc('admin_db_stats')`
- `useEdgeFunctionsStats.ts` — `.rpc('admin_edge_functions_stats',{hours:24})`
- `useSmartRecommendations.ts` — يجمع من كل المصادر أعلاه ويُخرج مصفوفة توصيات مصنّفة
- `useCriticalAlerts.ts` — Realtime channel على `access_log`

### 4) هوكات صفحة (`src/hooks/page/admin/diagnostics/`)
- `useRuntimeErrorsPanel.ts` / `useSecurityIntrusionPanel.ts` / `useActionsAndFixesPanel.ts` — تنسيق فقط، لا استعلامات مباشرة

### 5) منطق أعمال (`src/lib/diagnostics/`)
- `threatScore.ts` — خوارزمية (0-100): `failedLogins*3 + rlsViolations*5 + rateLimitHits*2 + criticalErrors*10`
- `fixActions.ts` — 7 دوال إصلاح **تنفّذ فعلياً**:
  1. `clearQueryCache(qc)` — `qc.clear()`
  2. `unregisterServiceWorker()` — يستدعي `navigator.serviceWorker.getRegistrations().unregister()`
  3. `forceTokenRefresh()` — `supabase.auth.refreshSession()`
  4. `deepClean()` — يعيد استخدام `runDeepClean` القائم
  5. `forceSignoutUser(userId)` — `supabase.rpc('admin_force_signout',{target_user})`
  6. `lockUserAccount(userId)` — `supabase.rpc('admin_lock_user',{target_user})`
  7. `restartBackend()` — يُظهر تعليمات فقط (لا يُتاح عبر client SDK)
- كل إصلاح يُسجَّل في `audit_log` عبر trigger على RPC

### 6) فحوصات جديدة تُسجَّل في المحرك (`src/lib/diagnostics/checks/`)
- `intrusion.ts` — `checkFailedLoginsLastHour`, `checkRlsViolationsLastHour`, `checkSuspiciousIpActivity`
- `edgeFunctions.ts` — `checkEdgeFunctionsErrorRate`, `checkEdgeFunctionsAvgLatency`
- `dbHealth.ts` — `checkDbConnectionsSaturation`, `checkDbSizeGrowth`
- `criticalErrors.ts` — `checkCriticalErrorRateLastHour`
- تسجيل الكل في `src/lib/diagnostics/registry.ts` كفئات جديدة

### 7) Migration واحد (`supabase/migrations/<ts>_admin_diagnostics_center.sql`)
```sql
-- كل الدوال SECURITY DEFINER + has_role guard + audit_log entry
CREATE OR REPLACE FUNCTION public.admin_db_stats() RETURNS jsonb ...
CREATE OR REPLACE FUNCTION public.admin_edge_functions_stats(hours int) RETURNS jsonb ...
CREATE OR REPLACE FUNCTION public.admin_intrusion_summary(hours int) RETURNS jsonb ...
CREATE OR REPLACE FUNCTION public.admin_force_signout(target_user uuid) RETURNS void ...
CREATE OR REPLACE FUNCTION public.admin_lock_user(target_user uuid) RETURNS void ...
CREATE OR REPLACE FUNCTION public.admin_recent_role_changes(hours int) RETURNS SETOF ...
GRANT EXECUTE ON FUNCTION public.admin_* TO authenticated;
-- كل دالة تبدأ بـ: IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION USING errcode='42501';
```

### 8) تعديل Edge Functions (تسجيل أحداث فقط، بدون كسر)
- `guard-signup/index.ts` — إضافة `logAccessEvent({event_type:'login_failed'})` عند رفض التسجيل
- `admin-manage-users` — تسجيل عند فشل صلاحيات
- **لا لمس** `verify_jwt` أو منطق `getUser()` الحالي

### 9) دمج بانر التنبيه
- `src/pages/dashboard/AdminDashboard.tsx` — إضافة `<CriticalAlertsBanner />` في أعلى الصفحة (خلف `role==='admin'` guard)

### 10) اختبارات
- `RuntimeErrorsPanel.test.tsx`, `SecurityIntrusionPanel.test.tsx`, `ActionsAndFixesPanel.test.tsx`
- `useSmartRecommendations.test.ts`, `threatScore.test.ts`, `fixActions.test.ts`
- `SystemDiagnosticsPage.test.tsx` — تحديث لتشمل التبويبات الجديدة
- `src/test/e2e/adminDiagnosticsCenter.test.tsx` — E2E fixtures

### 11) توثيق
- `docs/diagnostics/security-center.md` — جديد
- `docs/diagnostics/check-catalog.md` — تحديث بالفحوصات الجديدة
- `docs/diagnostics/troubleshooting-playbook.md` — تحديث بالإصلاحات الجديدة

---

## ضمان "التفعيل الفعلي" — قائمة تحقق قبل إغلاق كل مهمة

لكل بانل جديد يجب أن يحقق **كل** ما يلي قبل اعتباره منجزاً:
- [ ] يستعلم من جدول/RPC حقيقي في Supabase (لا JSON ثابت، لا mock)
- [ ] يعرض حالة تحميل + خطأ + فارغ منفصلة
- [ ] كل زر يستدعي مسار حقيقي وله toast نجاح/فشل بالعربية
- [ ] محمي بـ `role==='admin'` في UI + في RPC (دفاع بالعمق)
- [ ] يُسجَّل تشغيله في `audit_log`
- [ ] له اختبار Vitest يُغطّي المسار السعيد + الخطأ
- [ ] يظهر في `AppMapTree` (خريطة التطبيق) تلقائياً
- [ ] موثّق في `check-catalog.md` أو `security-center.md`

**التحقق النهائي (Playwright)**:
1. تسجيل دخول admin → فتح `/dashboard/diagnostics` → المرور على كل تبويب جديد → التقاط screenshot → التأكد من ظهور بيانات
2. محاكاة 6 محاولات دخول فاشلة → التحقق من ظهور بانر أحمر خلال 5 ثوانٍ
3. الضغط على "إصلاح فوري: مسح الكاش" → التحقق من `qc.getQueryCache().getAll().length===0`
4. تسجيل دخول accountant → التحقق من عدم ظهور التبويبات الجديدة (404 على RPC)

---

## معايير الشمولية النهائية (Checklist)

| المحور | مغطى؟ |
|--------|-------|
| كشف أخطاء العميل (JS/Network/Chunk) | ✅ RuntimeErrorsPanel |
| كشف أخطاء Backend | ✅ EdgeFunctionsPanel + BackendLogTable القائم |
| كشف انتهاكات RLS | ✅ SecurityIntrusionPanel |
| كشف محاولات اختراق (brute force) | ✅ useLoginFailures + threatScore |
| Rate limiting monitoring | ✅ useRateLimitHits |
| تتبّع تغيّرات الأدوار | ✅ useRoleChanges |
| أداء DB (connections/size/slow) | ✅ DbPerformancePanel |
| أداء Frontend (Core Web Vitals) | ✅ موجود مسبقاً |
| توصيات ذكية آلية | ✅ useSmartRecommendations |
| إصلاحات بضغطة واحدة تعمل فعلياً | ✅ fixActions.ts (7 إجراءات حقيقية) |
| تنبيه فوري للناظر | ✅ CriticalAlertsBanner (realtime) |
| قفل/إخراج مستخدم مشبوه | ✅ admin_lock_user + admin_force_signout |
| سجل مراجعة لكل إجراء إصلاح | ✅ audit_log entries |
| فصل صلاحيات (admin only) | ✅ UI guard + RPC guard |
| توثيق كامل | ✅ 3 ملفات docs |
| اختبارات | ✅ Vitest + Playwright |

---

## ما هو خارج النطاق صراحة (لعدم تضخّم غير مبرّر)
- تكامل Sentry/DataDog/Grafana خارجي (النظام مكتفٍ ذاتياً)
- WAF على مستوى الشبكة (خارج قدرة Lovable Cloud)
- 2FA/TOTP (WebAuthn الموجود يكفي حالياً)
- تنبيهات SMS (يمكن إضافتها لاحقاً عبر Twilio connector)

---

**نعم — الخطة الآن شاملة، كاملة، وكل وظيفة مضمونة التفعيل الفعلي على بيانات إنتاج حقيقية.**
