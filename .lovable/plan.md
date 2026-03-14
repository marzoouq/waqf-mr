

# خطة تنفيذ صفحة التقرير السنوي الشامل للإنجازات

## الفكرة

صفحة احترافية يُدخل فيها الناظر (admin) تقريراً سنوياً لكل سنة مالية يتضمن:
- **حالة العقارات**: ما تمت صيانته وما يحتاج صيانة، إنجازات كل عقار والمتبقي
- **مقارنة الدخل**: دخل آخر 3 سنوات مقابل الدخل الحالي (تلقائي من DB)
- **الإنجازات والخطط والتحديات**: إدخال يدوي من الناظر
- **حالة النشر**: مسودة/منشور — المستفيد يرى فقط المنشور

---

## 1. قاعدة البيانات — جدولان جديدان

### جدول `annual_report_items`
يخزن كل عنصر في التقرير (إنجاز، تحدي، خطة، حالة عقار):

```sql
CREATE TABLE public.annual_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid NOT NULL,
  section_type text NOT NULL DEFAULT 'achievement',
  -- أنواع: achievement, challenge, future_plan, property_status
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  property_id uuid,  -- مرتبط بعقار (لقسم حالة العقارات فقط)
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### جدول `annual_report_status`
حالة نشر التقرير لكل سنة:

```sql
CREATE TABLE public.annual_report_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### سياسات RLS
- Admin/Accountant: تحكم كامل (ALL)
- Beneficiary/Waqif: قراءة فقط (SELECT) مقيدة بـ `is_fiscal_year_accessible` + حالة النشر = `published`

---

## 2. الملفات الجديدة (8 ملفات)

| الملف | الوصف |
|---|---|
| `src/hooks/useAnnualReport.ts` | CRUD hooks: عناصر التقرير + حالة النشر + استعلام مقارنة الدخل 3 سنوات |
| `src/pages/dashboard/AnnualReportPage.tsx` | صفحة الناظر: 4 تبويبات + CRUD + ملخص تلقائي + نشر |
| `src/pages/beneficiary/AnnualReportViewPage.tsx` | صفحة المستفيد: قراءة + طباعة + تصدير |
| `src/components/annual-report/ReportItemCard.tsx` | بطاقة عنصر واحد (عرض/تعديل/حذف) |
| `src/components/annual-report/ReportItemFormDialog.tsx` | ديالوج إضافة/تعديل عنصر |
| `src/components/annual-report/PropertyStatusSection.tsx` | قسم حالة العقارات (صيانة/إنجازات/متبقي) |
| `src/components/annual-report/IncomeComparisonChart.tsx` | رسم بياني لمقارنة الدخل عبر 3 سنوات (recharts) |
| `src/utils/pdf/annualReport.ts` | مولّد PDF للتقرير السنوي |

---

## 3. تعديل ملفات موجودة (4 ملفات)

| الملف | التغيير |
|---|---|
| `src/App.tsx` | إضافة مسارين: `/dashboard/annual-report` + `/beneficiary/annual-report` |
| `src/components/DashboardLayout.tsx` | إضافة رابط "التقرير السنوي" في قوائم admin و beneficiary |
| `src/constants/rolePermissions.ts` | إضافة `annual_report: true` للأدوار |
| `src/utils/pdf/index.ts` | تصدير `generateAnnualReportPDF` |

---

## 4. تصميم صفحة الناظر

```text
┌──────────────────────────────────────────────────┐
│  📋 التقرير السنوي   [سنة مالية ▼]              │
│  حالة: مسودة ●  [نشر التقرير] [PDF] [طباعة]     │
├──────────────────────────────────────────────────┤
│  بطاقات ملخصة (تلقائية من DB):                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │إجمالي   │ │إجمالي   │ │عقود     │ │توزيعات │ │
│  │الدخل    │ │المصروفات│ │نشطة     │ │        │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
├──────────────────────────────────────────────────┤
│  📊 مقارنة الدخل (3 سنوات) — Bar Chart          │
├──────────────────────────────────────────────────┤
│  Tabs:                                           │
│  حالة العقارات | الإنجازات | التحديات | الخطط    │
├──────────────────────────────────────────────────┤
│  تبويب "حالة العقارات":                          │
│  [+ إضافة تقرير عقار]                            │
│  ┌───────────────────────────────────────────┐   │
│  │ 🏢 عمارة الرياض — رقم العقار: P001        │   │
│  │ صيانة مكتملة: تجديد السباكة              │   │
│  │ صيانة مطلوبة: طلاء الواجهة               │   │
│  │ إنجازات: رفع نسبة الإشغال 80→95%         │   │
│  │                        [تعديل] [حذف]     │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  تبويب "الإنجازات/التحديات/الخطط":               │
│  [+ إضافة]                                       │
│  بطاقات CRUD عادية بعنوان + محتوى               │
└──────────────────────────────────────────────────┘
```

### تبويب حالة العقارات
- يعرض قائمة العقارات الموجودة في DB (من جدول `properties`)
- الناظر يضيف تقريراً لكل عقار: ما تمت صيانته، ما يحتاج صيانة، الإنجازات، المتبقي
- `section_type = 'property_status'` مع `property_id` مرتبط

### مقارنة الدخل
- استعلام تلقائي من جدول `income` لآخر 3 سنوات مالية + السنة الحالية
- عرض بـ Bar Chart (recharts موجود في المشروع)

---

## 5. صفحة المستفيد

نفس التصميم لكن:
- بدون أزرار إضافة/تعديل/حذف/نشر
- تظهر فقط التقارير المنشورة (`status = 'published'`)
- أزرار: تصدير PDF + طباعة فقط

---

## 6. ألوان الأقسام

- حالة العقارات: `slate` (رمادي)
- الإنجازات: `emerald` (أخضر)
- التحديات: `amber` (برتقالي)
- الخطط المستقبلية: `blue` (أزرق)

