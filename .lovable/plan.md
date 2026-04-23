

# خطة تنفيذ التحسينات المعمارية

سأنفّذ **كامل المراحل الأربع** من تقرير الفحص المعماري، بترتيب من الأكثر حرجاً إلى الاختياري، مع التحقق بعد كل مرحلة.

## المرحلة 1 — إصلاحات حرجة

### 1.1 إصلاح انتهاك اتجاه الطبقات (A1)
- إنشاء `src/hooks/data/dashboard/types.ts` يحتوي تعريف `BeneficiaryDashboardData`
- تعديل `useBeneficiaryDashboardRpc.ts` لاستيراد النوع من المصدر الجديد
- تعديل `useBeneficiaryDashboardData.ts` (في `hooks/page/`) لإعادة تصدير النوع من نفس المصدر للحفاظ على التوافق الخلفي

### 1.2 إصلاح Tailwind Interpolation (A4)
- في `src/components/dashboard/views/AccountantDashboardView.tsx:146`:
  - استبدال `[&>div]:${color}` بـ map ثابت: `bg-success` / `bg-warning` / `bg-destructive`
  - استخدام `cn()` من `@/lib/utils` للدمج

## المرحلة 2 — توحيد نمط Page Hook

### 2.1 استخراج منطق `AdminDashboard` (A2)
- إنشاء `src/hooks/page/admin/dashboard/useAdminDashboardPage.ts`
- نقل تنسيق الهوكات الأربعة (`useDashboardSummary`, `useDashboardSecondary`, `useAdminDashboardData`, `useAccountantDashboardData`)
- إرجاع كائن `ctx` موحّد
- تبسيط `AdminDashboard.tsx` ليصبح `<View {...ctx} />`

### 2.2 فحص الصفحات الثلاث الأخرى (A3)
- مراجعة `ReportsPage.tsx` (220 سطر) — الأولوية
- مراجعة `HistoricalComparisonPage.tsx`, `SystemDiagnosticsPage.tsx`, `UserManagementPage.tsx`
- استخراج page hook فقط للصفحات التي تحوي ≥5 متغيرات/handlers

### 2.3 فحص لوحات المستفيد/الواقف
- التحقق من `BeneficiaryDashboard.tsx` و `WaqifDashboard.tsx`
- تطبيق نفس النمط إذا لزم

## المرحلة 3 — تنظيف بنيوي

### 3.1 دمج `components/admin/beneficiaries` (A5)
- نقل المكونات من `src/components/admin/beneficiaries/` إلى `src/components/beneficiary/admin/`
- تحديث جميع الاستيرادات
- حذف المجلد الفارغ `components/admin/`

### 3.2 نقل `components/financial` (A6)
- نقل `FinancialChartsInner.tsx` إلى `src/components/dashboard/charts/`
- تحديث استيراد `LazyFinancialCharts` (إن وجد)
- حذف المجلد الفارغ

### 3.3 تدقيق `utils/*` (A7)
- بحث عن أي `import { supabase }` متخفّي في `utils/zatca/`, `utils/reports/`, `utils/pdf/`
- إذا وُجد، نقل الجزء المتعلق إلى `lib/services/` المناسب

## المرحلة 4 — تحسينات اختيارية

### 4.1 مراجعة `index.ts` barrels (A8)
- تحديد barrels ذات مستهلك واحد فقط
- إزالتها واستبدالها باستيرادات مباشرة

### 4.2 إزالة `ContractsContext` إن كان غلافاً رفيعاً (A10)
- التحقق من محتواه (13 سطراً)
- إذا كان مجرد wrapper، استبداله باستهلاك hook مباشر في المستهلكين

### 4.3 توحيد تسمية ملفات `routes/` (A11)
- إعادة تسمية `protectedRoute.tsx` → `ProtectedRoute.tsx`
- تحديث الاستيرادات

## القيود والضمانات

- **لن أمسّ** ملفات المصادقة (`AuthContext`, `ProtectedRoute` المنطق نفسه — فقط اسم الملف في 4.3)
- **لن أمسّ** الملفات المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`)
- **لن أمسّ** أي منطق مالي أو RLS
- كل تغيير = نقل/إعادة تنظيم فقط، **بدون تغيير سلوك**
- اختبار TypeScript بعد كل مرحلة عبر قراءة الأخطاء

## ما لن أفعله في هذه الخطة

- لن أُجري إصلاحات بصرية من تقرير الفحص البصري السابق (مشكلة منفصلة)
- لن أُضيف ميزات جديدة
- لن أُعدّل قواعد البيانات أو RLS

## ترتيب التسليم

سأنفّذ المراحل بالتسلسل (1 → 2 → 3 → 4) وأُبلغك بعد كل مرحلة بالملفات المتأثرة لتتمكن من المراجعة قبل المتابعة. إذا فضّلت تنفيذ مراحل محددة فقط، أخبرني الآن قبل البدء.

