## خطة الإصلاح الشاملة — مراجعة نهائية مكتملة

تغطية كاملة لكل بند في التقرير الشامل، مقسّمة على **3 مراحل** + مرحلة تحقق نهائية.

---

### المرحلة P0 — حرجة (تُكسر الاختبارات والـ ESLint حالياً)

#### 1. إكمال ميتاداتا ميزة الأرشيف (يحل 4 اختبارات فاشلة)
- **`src/test/dashboardRoutesContract.test.ts`** — إضافة إلى `ROUTE_TO_FILE`:
  - `'/dashboard/archive': 'src/pages/dashboard/ArchivePage.tsx'`
  - `'/beneficiary/archive': 'src/pages/beneficiary/ArchiveViewPage.tsx'`
- **`src/constants/rolePermissions.ts`** — إضافة `archive` إلى `DEFAULT_ROLE_PERMS.accountant` (والتحقق من admin/beneficiary/waqif)
- فحص `permissionKeysCoverage.test.ts` لمعرفة لماذا يفشل `/beneficiary/archive` رغم وجوده في `ROUTE_ROLES` — تطبيع المسار أو إضافة استثناء

#### 2. migration: GRANT لـ `log_access_event` (يحل اختبار publicRpcAccess)
- جلب توقيع الدالة من DB
- `GRANT EXECUTE ON FUNCTION public.log_access_event(<args>) TO anon, authenticated;`

#### 3. إصلاح ESLint Errors الأربعة
- **`src/components/diagnostics/RunHistoryList.tsx:15`** — استبدال `useEffect` بـ `useState` lazy initializer
- **`src/hooks/application/useAiChat.ts:23-29`** — refactor: تحويل refs المتغيّرة إلى state داخل hook منفصل، أو استخدام setter ثابت بدلاً من تعديل `.current` خارج الـ hook

**تحقق P0**: `bunx tsc --noEmit && bunx eslint src && bunx vitest run` — يجب أن يمر الكل

---

### المرحلة P1 — جودة (تحذيرات runtime + ESLint warnings)

#### 4. مزامنة Zod schema لـ `dashboard-summary` (يحل تحذير console)
- فحص `supabase/functions/dashboard-summary/index.ts` للتأكد من إرجاع `fetched_at` كـ ISO string
- إن كان الحقل اختياري، تحديث Zod schema في client إلى `fetched_at: z.string().optional()`

#### 5. إصلاح missing dependencies (2 تحذير)
- **`src/hooks/page/admin/dashboard/useAggregatedAnnualReport.ts:145`** — إضافة `isClosed` إلى deps
- **`src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts:57`** — إضافة `fiscalYear` إلى deps (مع منع loops)

#### 6. تنظيف ESLint warnings المتبقية (4 تحذيرات)
- حذف `eslint-disable` غير المستخدم في `useSystemDiagnostics.ts:116` و`deepClean.test.ts:45`
- **`EmailMonitorPrimitives.tsx:51`** — نقل الثوابت المُصدَّرة إلى `EmailMonitorConstants.ts` (fast-refresh)

**تحقق P1**: `bunx eslint src --max-warnings=0` يمر صفر تحذيرات

---

### المرحلة P2 — تحسينات لاحقة

#### 7. مراجعة دوال SECURITY DEFINER (75 WARN)
- استعلام DB لجلب كل دوال `SECURITY DEFINER` في `public`
- تصنيف:
  - **public بضرورة** (`has_role`, `log_access_event`, RPCs المستخدمة من client) — لا تغيير
  - **داخلية فقط** (triggers, helpers) — `REVOKE EXECUTE FROM authenticated, anon`
- migration واحدة تجمع REVOKEs

#### 8. تقسيم ملفات الإنتاج > 270 سطر
- **`src/utils/pdf/reports/aggregatedAnnualReport.ts` (274 سطر)** → `aggregatedAnnualReportSections.ts` + `aggregatedAnnualReportLayout.ts` + orchestrator ≤180 سطر
- **`src/lib/diagnostics/checks.ts` (273 سطر)** → تقسيم حسب الفئة: `checks/auth.ts`, `checks/db.ts`, `checks/edge.ts`, `checks/conventions.ts`

---

### تحذيرات مرصودة لا تتطلب إجراء

- **`BfcacheSafe Channel CHANNEL_ERROR`** المتكررة في console — ناتجة عن `[vite] server connection lost. Polling for restart...` (dev-only، تختفي في production). **لا إجراء**.
- **`Security Definer View` (1 ERROR)** — `contracts_safe` تستخدم `security_invoker=false` **عمداً** لإخفاء PII حسب الذاكرة المحفوظة (`mem://security/views/contracts-safe-rationale`). **ممنوع التبديل**.
- ملفات الاختبارات > 200 سطر (`useComputedFinancials.test.ts`, إلخ) — مقبولة (اختبارات قد تكون طويلة).

---

### مرحلة التحقق النهائي (Verification Gate)

بعد إنهاء P0+P1+P2:
1. `bunx tsc --noEmit` → 0 errors
2. `bunx eslint src --max-warnings=0` → 0 errors, 0 warnings
3. `bunx vitest run` → 2135/2135 ناجح
4. `node scripts/audit-all.mjs` → 0 critical, 0 GAP
5. `supabase--linter` → 1 ERROR (مقصود) + < 20 WARN
6. console preview نظيف من تحذيرات Zod
7. اختبار Playwright سريع على `/dashboard` و`/dashboard/archive` و`/beneficiary/archive` لرصد أي regression بصري

---

### حدود وضمانات صارمة

- **لا مساس بـ**: `AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`, `client.ts`, `types.ts`, `config.toml`, `.env`
- **لا تغيير على**: `contracts_safe` view (SECURITY DEFINER مقصود)، `verify_jwt = false` في Edge Functions
- **migration GRANT آمنة** (إضافة صلاحية، لا حذف بيانات)
- جميع تعديلات P0/P1 موضعية (≤10 أسطر/ملف)
- توقف فوري وإبلاغ المستخدم إن ظهر أي regression غير متوقع

### تغطية البنود في التقرير

| بند التقرير | المعالجة |
|---|---|
| 4 ESLint errors | P0 #3 |
| 5 Vitest failures (4 archive + 1 RPC) | P0 #1, #2 |
| Zod `fetched_at` | P1 #4 |
| 2 missing deps | P1 #5 |
| 4 ESLint warnings | P1 #6 |
| 75 SECURITY DEFINER WARN | P2 #7 |
| ملفات > 270 سطر | P2 #8 |
| 1 Security Definer View | موثّق كمقصود |
| BfcacheSafe warnings | موثّق كـ dev-only |

✅ **التغطية: 100% من بنود التقرير**.

هل أبدأ التنفيذ من P0؟
