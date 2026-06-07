# صفحة «تقرير التدقيق النهائي»

## النطاق
صفحة جديدة للناظر تعرض نتائج تدقيق جولة B1–B15 على لوحة المستفيد، مع بطاقة إحصائية ورابط تفصيلي لكل بند يكشف المسار والسطر داخل الملف المعدَّل.

## الافتراضيات
- **الوصول**: محصور بدور `admin` (الناظر) فقط.
- **المسار**: `/dashboard/audit-report-final`.
- **القائمة الجانبية**: لا يُضاف رابط جديد لتجنّب تضخّم القائمة — الوصول من «سجل المراجعة» (AuditLogPage) عبر زر إضافي أعلى الصفحة.
- **المحتوى**: B1–B15 فقط (آخر جولة)، مع ملخّص رقمي للجولات السابقة (4 حرجة + 14 متوسطة + 4 مؤثّرة) كبطاقة موجزة.

## الملفات

### جديدة
- `src/pages/dashboard/AuditReportFinalPage.tsx` — الصفحة الحاوية (presentational فقط ≤200 سطر).
- `src/components/dashboard/audit-report/AuditSummaryStats.tsx` — 4 بطاقات (إجمالي/منفّذ/موثَّق/مرفوض).
- `src/components/dashboard/audit-report/AuditFindingCard.tsx` — بطاقة بند واحد (B#).
- `src/constants/auditFindings.ts` — مصدر البيانات الثابت: 15 بنداً + روابط الملفات + الأسطر.

### معدَّلة
- `src/routes/adminRoutes.tsx` — إضافة Route مع `lazyWithRetry` وحراسة `ADMIN_ROLES`.
- `src/pages/dashboard/AuditLogPage.tsx` — زر «تقرير التدقيق النهائي» يفتح المسار الجديد.

## محتوى البيانات (`auditFindings.ts`)
مصفوفة `AUDIT_B_FINDINGS` بنوع:
```ts
type AuditFinding = {
  id: 'B1' | 'B2' | ... | 'B15';
  title: string;          // عربي
  status: 'implemented' | 'documented' | 'rejected';
  severity: 'security' | 'ux' | 'a11y' | 'consistency' | 'performance';
  rationale: string;      // سطر-سطرين
  files: { path: string; lines: string }[]; // مثال: { path: 'src/pages/beneficiary/AnnualReportViewPage.tsx', lines: '24, 35-36' }
};
```

## التصميم
- استخدام `DashboardLayout` + `PageHeaderCard` (الأيقونة: `ShieldCheck`).
- بطاقات الملخّص بألوان semantic: `success` للمنفّذ، `muted` للموثَّق، `warning` للمرفوض.
- كل `AuditFindingCard` يحوي:
  - Badge للحالة + Badge للفئة (security/ux/...).
  - عنوان + سبب مختصر.
  - قائمة ملفات بنمط `<code>` (نص فقط، غير قابل للنقر — المسارات مرجعية لمحرّر المطوّر).
- زر تصدير PDF عبر `usePrint` المتوفر.
- حالة فارغة غير مطلوبة (البيانات ثابتة).

## التحقق
- لا تأثير على business logic أو RLS.
- لا استدعاءات Supabase (صفحة عرض ثابتة).
- يلتزم بـ Page Hook Pattern (لا منطق — البيانات ثابتة مستوردة).
- ≤200 سطر لكل ملف.

## خارج النطاق
- جلب الملفات الفعلية من نظام الملفات (الصفحة عرض توثيقي مرجعي فقط).
- إضافة رابط للقائمة الجانبية.
- توسعة لاحقاً لتشمل جولات أخرى — يمكن إضافة tabs لاحقاً بسهولة.
