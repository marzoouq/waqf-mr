## خطة الفحص الشامل والعميق للتطبيق بالكامل

فحص تدقيقي على **9 محاور** يغطي كل ملف، مجلد، صفحة، لوحة تحكم، Edge Function، جدول DB، ومسار مستخدم — دون أي تعديل على الكود.

---

### المحور 1 — الكود الثابت (Static Analysis)
- `bunx tsc --noEmit` — صفر أخطاء TypeScript
- `bunx eslint src --max-warnings=0` — تقرير كامل
- البحث عن أنماط محظورة في كامل `src/`:
  - `console.log/warn/error` خام (يجب `logger`)
  - `localStorage` لأدوار أو `fiscal_year_id` (يجب `sessionStorage`)
  - `any` بدون مبرر
  - ألوان hex خارج Canvas/SVG/print
  - `@/integrations/supabase/client` داخل `src/pages/` و`src/components/`
  - `toast` داخل `src/hooks/data/`
  - استيرادات barrel → barrel
  - ملفات > 200 سطر و > 180 سطر للمكونات
  - props ≥ 5 غير مجمّعة
- `tailwind.config` و`index.css`: التحقق من اكتمال tokens

### المحور 2 — المعمارية والاتفاقيات
- تشغيل كامل: `node scripts/audit-all.mjs` (يغطي structure + conventions + hooks-layout + ui-permissions + page-controls)
- التحقق من Page Hook Pattern: كل صفحة في `src/pages/` بدون منطق
- فصل طبقات: `hooks/data/` نقي، `hooks/domain/` حسابات، `hooks/page/` تنسيق، `hooks/application/` controllers، `hooks/auth/` (session/role/biometric/flows)، `hooks/ui/` عرض
- `utils/` (دوال نقية) vs `lib/` (stateful)
- مراجعة `audit/conventions-deep-violations.csv` و`audit/hooks-layout-report.md` و`audit/ui-permissions-audit.csv` و`audit/page-controls-audit.md`
- التحقق من `routeRegistry.ts` ↔ `routeRoles.ts` ↔ `adminRoutes.tsx` ↔ `beneficiaryRoutes.tsx` ↔ `waqifRoutes.tsx` متّسقة

### المحور 3 — قاعدة البيانات والأمن
- `supabase--linter` — تقرير المحاذير
- `security--run_security_scan` + `security--get_scan_results`
- استعلامات تحقق على كل الجداول الـ 42:
  - RLS مفعّل + GRANT صحيح
  - عدم وجود FK مباشرة إلى `auth.users`
  - سياسات `archived_documents` + storage `waqf-documents` + `waqf-assets`
  - دوال `SECURITY DEFINER` لها `SET search_path = public`
  - استخدام `has_role()` بدلاً من `jwt_role()`
- فحص الفهارس على الأعمدة الحرجة (fiscal_year_id, beneficiary_id, contract_id, is_published)
- التحقق من triggers الـ 29 والدوال الـ 32

### المحور 4 — Edge Functions (الـ 11 وظيفة)
لكل وظيفة في `supabase/functions/`:
- `admin-manage-users`, `ai-assistant`, `auth-email-hook`, `check-contract-expiry`, `dashboard-summary`, `generate-invoice-pdf`, `generate-voucher-pdf`, `guard-signup`, `health-check`, `lookup-national-id`, `multi-year-summary`, `process-email-queue`, `webauthn`, `year-comparison-summary`, `zatca-xml-generator`
- التحقق من:
  - `getUser()` لا `getSession()`
  - Zod validation على body
  - عدم تسريب `SUPABASE_SERVICE_ROLE_KEY`
  - CORS صحيحة (`_shared/cors.ts`)
  - معالجة أخطاء موحّدة
- `supabase--edge_function_logs` — قراءة آخر السجلات لكل وظيفة

### المحور 5 — فحص وقت التشغيل (Runtime عبر Playwright)
لكل دور، تنفيذ Playwright headless على localhost:8080 مع التقاط:
- لقطة شاشة لكل صفحة
- console errors
- network 4xx/5xx
- runtime errors

**admin** (جميع المسارات):
`/dashboard`, `/dashboard/contracts`, `/dashboard/properties`, `/dashboard/beneficiaries`, `/dashboard/income`, `/dashboard/expenses`, `/dashboard/advance-requests`, `/dashboard/distributions`, `/dashboard/invoices`, `/dashboard/vouchers`, `/dashboard/accounts`, `/dashboard/chart-of-accounts`, `/dashboard/annual-report`, `/dashboard/audit-report-final`, `/dashboard/historical-comparison`, `/dashboard/multi-year`, `/dashboard/archive`, `/dashboard/audit-log`, `/dashboard/access-log`, `/dashboard/cleanup-report`, `/dashboard/email-monitor`, `/dashboard/zatca`, `/dashboard/messages`, `/dashboard/support`, `/dashboard/users`, `/dashboard/settings`, `/dashboard/system-diagnostics`

**accountant**: نفس المسارات + التحقق من حجب الإعدادات/المستخدمين/الإقفال

**beneficiary**:
`/beneficiary/dashboard`, `/beneficiary/contracts`, `/beneficiary/invoices`, `/beneficiary/expenses`, `/beneficiary/accounts`, `/beneficiary/carryforward`, `/beneficiary/annual-report`, `/beneficiary/archive`, `/beneficiary/disclosure`, `/beneficiary/reports`, `/beneficiary/messages`, `/beneficiary/notifications`, `/beneficiary/support`, `/beneficiary/settings`

**waqif**:
`/waqif/dashboard` وكل الصفحات الفرعية

**public**: `/`, `/auth`, `/reset-password`, `/install`, `/privacy`, `/terms`, `/unauthorized`, `/404`

لكل صفحة: التحقق من RTL، تحميل البيانات، عدم وجود شاشات بيضاء/أخطاء "حدث خطأ".

### المحور 6 — لوحات التحكم والـ Widgets
- **Admin Dashboard**: KPI cards، الرسوم البيانية، الإجراءات السريعة، التنبيهات
- **Accountant Dashboard**: تحقق من الفلترة (عدم ظهور Waqf Revenue)
- **Beneficiary Dashboard**: widgets قابلة للتخصيص عبر `app_settings`
- **Waqif Dashboard**: تقارير عامة فقط
- التحقق من `BeneficiaryQuickLinks`, `WaqifQuickLinks`, `bottomNavLinks`, `navigation.ts`, `sections.ts`
- اتساق `useSectionsVisibility` مع DB

### المحور 7 — المنطق المالي والأعمال
استعلامات تحقق ضد قواعد الذاكرة:
- **LRM parity** server (`execute_distribution`) vs client
- **Revenue recognition** (upfront في السنة الحالية، periodic حسب due date)
- **Net cash flow** = post-tax Waqf Revenue
- **Advance limits** ≤ % من الحصص الفعلية
- **Negative guards** `Math.max(0)` على net shares
- **Fiscal year**: منع إقفال سنة فارغة، حماية reopen
- **ZATCA ICV chain**: تسلسل صحيح، `reserve_icv` + `commit_icv_chain`
- **Contract allocation v3**: حدود السنة المالية مع exclusive end dates
- **Renewal PII**: نقل بيانات المستأجر عند التجديد
- **Balance sheet**: Corpus مستخرج من Waqf Revenue (لا double counting)
- **Invoice deletion safeguard**: منع حذف الفواتير المدفوعة جزئياً
- **VAT centrality**: `vat_amount` فقط، لا إدخال يدوي

### المحور 8 — الاختبارات والجودة
- `bunx vitest run` — تشغيل كل الاختبارات
- تقرير التغطية للوحدات الحديثة
- رصد ميزات بدون اختبارات (مثل archive)
- مراجعة `audit/forensic-*` للقضايا المعلّقة
- مراجعة `audit/beneficiary-deep-audit-*`

### المحور 9 — الأداء وإمكانية الوصول (a11y)
- تحليل الاستعلامات البطيئة: `supabase--slow_queries`
- `supabase--db_health` و`supabase--cloud_status`
- رصد `dashboard-summary` (~3.4s) ومحاولات تحسين
- تحذيرات `DialogContent` بدون `DialogDescription`
- تحقق من `staleTime` ملائم (1-5 دقائق)
- حدود الاستعلام (500 record warning, 2000 max)
- PWA: `manifest.webmanifest`، service worker، `_headers`، تحديث التطبيق

---

### مخرجات التقرير النهائي
1. **ملخّص تنفيذي**: حالة (🟢/🟡/🔴) لكل من — الكود، المعمارية، DB، Edge Functions، 4 لوحات تحكم، المنطق المالي، الأداء
2. **يعمل بكفاءة**: قائمة الأقسام السليمة
3. **مشاكل حرجة (Blockers)**: تمنع التشغيل — ملف:سطر
4. **مشاكل متوسطة (Warnings)**: ديون تقنية، أداء
5. **ملاحظات a11y/UX**
6. **خروقات الاتفاقيات**: من `audit-all.mjs`
7. **توصيات بأولويات** P0/P1/P2 مع تقدير الجهد
8. **مرفقات**: لقطات شاشة لكل صفحة، مخرجات الأدوات الخام، CSVs

### حدود صارمة
- صفر تعديل على أي ملف
- لا migrations ولا deploys
- لا مساس بـ `AuthContext`, `client.ts`, `types.ts`, `config.toml`, `.env`
- جميع المشاكل تُعرض للمراجعة قبل أي إصلاح

هل أبدأ التنفيذ؟
