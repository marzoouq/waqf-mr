# خطة متابعة التدقيق الشامل (المراحل 2-4)

تم إنجاز المرحلة 1 (توحيد المنطق المالي على مستوى RPC + Frontend). هذه الخطة تكمل ما تبقى.

## المرحلة 2 — أداة تشخيص اتساق البطاقات (Diagnostic Tool)

**الهدف:** كشف أي انحراف عددي بين بطاقات لوحة الناظر والمستفيد والمحاسب والـRPC مصدر البيانات.

**الملفات الجديدة:**
- `src/lib/diagnostics/cardConsistencyCheck.ts` — دالة `runCardConsistencyAudit(fiscalYearId)` تُرجع تقريراً منظماً يقارن:
  - `available_amount` (Admin RPC) مقابل `share_percentage × available_amount` (Beneficiary)
  - `total_received` (Beneficiary RPC) مقابل `SUM(distributions WHERE status='paid')`
  - `overdue_count` vs `pending_count` (Accountant) — التأكد من عدم التداخل
  - `net_after_zakat` من `accounts` مقابل قراءات الـhooks الثلاثة
  - `paidAdvancesTotal` و`carryforward_balance` ضمن نفس النطاق الزمني
- `src/lib/diagnostics/__tests__/cardConsistency.test.ts` — اختبارات Vitest على بيانات seed لكل دور
- صفحة مخفية للأدمن فقط: `src/pages/admin/DiagnosticsPage.tsx` تعرض النتائج في جدول قابل للتصدير CSV (للاستخدام التشخيصي فقط، لا تظهر في القائمة الرئيسية إلا للأدمن)

**حدود الأمان:** أداة قراءة فقط، لا تُعدّل أي بيانات، لا تتأثر بها السنوات المقفلة.

## المرحلة 3 — التدقيق الوظيفي الشامل (Sub-agent Audit)

**الهدف:** فحص كل زر/تبويب/رابط/استعلام في الصفحات الثلاث.

**النهج:** استخدام `acp_subagent--explore` بثلاث مهام متوازية:

1. **لوحة الناظر** (`src/pages/dashboard/AdminDashboard.tsx` + جميع الويدجتس):
   - أزرار ميتة، تبويبات فارغة، روابط مكسورة
   - استعلامات مكررة بين `useAdminDashboardPage` و`useAdminDashboardStats`
   - تطابق البيانات المعروضة مع مصادرها الفعلية
   
2. **لوحة المستفيد** (`src/pages/beneficiary/*`):
   - صفحات: MyShare, MyAdvances, MyDistributions, MyDisclosure
   - تحقق من ربط كل بطاقة بـ hook صحيح
   - أزرار طلب السلفة وحالاتها

3. **لوحة المحاسب** (`src/pages/accountant/*` + AccountantDashboard widgets):
   - بطاقات الإفصاح المخفية، فلاتر `overdue` vs `pending`
   - تكامل مع `useAccountantDashboardData`

**المخرج:** تقرير منظم لكل لوحة في `.lovable/audit-findings-stage3.md` يحتوي:
- قائمة العناصر السليمة ✓
- المشاكل المكتشفة مع المسار:السطر
- توصية إصلاح لكل مشكلة (مرتبة حسب الخطورة)

## المرحلة 4 — التحقق النهائي والتوثيق

1. **تشغيل اختبارات شاملة:**
   ```
   vitest run src/hooks src/utils src/lib/diagnostics
   ```
   هدف: 100% pass على ≥317 اختباراً + الاختبارات الجديدة

2. **مقارنة قبل/بعد على سنة مقفلة** (read-only عبر `supabase--read_query`):
   - اختيار سنة مقفلة عشوائية
   - مقارنة قيم RPC الجديدة مع snapshot `accounts` للتأكد من عدم التغيير

3. **تحديث `mem://` حسب الحاجة** — إضافة:
   - قاعدة جديدة لـ `available_amount_raw` (للشفافية الإدارية)
   - تحديث قاعدة `Net Share Logic` لتعكس أولوية `prev_net_after_zakat` snapshot

4. **توثيق ختامي:** `.lovable/audit-report-2026-06-03.md`
   - ملخص جميع المراحل الأربع
   - قائمة الملفات المعدلة
   - دليل تشغيل أداة التشخيص للأدمن
   - قيود معروفة وتوصيات مستقبلية

## ضمانات الأمان

- لا تعديل على: `auth/`, `client.ts`, `types.ts`, `config.toml`, `.env`
- لا تغيير على بيانات السنوات المقفلة (snapshots محمية)
- جميع الإضافات الجديدة (Diagnostics) محمية بـ `has_role('admin')`
- لا migrations جديدة في هذه المراحل — المرحلة 1 أنجزت كل تغييرات DB

## الترتيب الزمني المتوقع

1. المرحلة 2 (أداة التشخيص + اختبارات) — أولاً، لأنها أساس التحقق
2. المرحلة 3 (Sub-agents متوازية) — بعد توفر الأداة
3. المرحلة 4 (تحقق نهائي + توثيق) — ختامياً

هل أبدأ بالمرحلة 2؟