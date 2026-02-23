# إضافة صلاحية حجب/نشر السنة المالية للمستفيدين

## الفكرة

إعطاء الناظر تحكماً كاملاً في ظهور كل سنة مالية للمستفيدين، عبر زر "نشر/حجب" لكل سنة مالية في لوحة التحكم. السنة المحجوبة لن تظهر للمستفيدين في أي مكان (القائمة المنسدلة، التقارير، الحسابات).

---

## التغييرات المطلوبة

### الجزء 1: قاعدة البيانات

إضافة عمود `published` لجدول `fiscal_years`:

```sql
ALTER TABLE public.fiscal_years
  ADD COLUMN published boolean NOT NULL DEFAULT false;
```

- القيمة الافتراضية `false` (محجوبة) حتى يقرر الناظر نشرها
- الناظر والمحاسب يرون جميع السنوات دائماً بغض النظر عن حالة النشر

### الجزء 2: تحديث سياسة RLS

تعديل سياسة عرض السنوات المالية للمستفيدين والواقف لتقتصر على السنوات المنشورة فقط:

- حذف السياسة الحالية "Authorized roles can view fiscal_years"
- إنشاء سياستين بديلتين:
  1. **الناظر والمحاسب**: يرون جميع السنوات (منشورة وغير منشورة)
  2. **المستفيد والواقف**: يرون فقط السنوات التي `published = true`

### الجزء 3: واجهة الناظر (FiscalYearManagementTab)

إضافة زر "نشر/حجب" لكل سنة مالية بجانب أزرار الإقفال والحذف:

- زر بأيقونة عين (Eye/EyeOff) مع نص "نشر للمستفيدين" / "حجب عن المستفيدين"
- شارة (Badge) توضح حالة النشر: "منشورة" باللون الأخضر أو "محجوبة" باللون البرتقالي
- رسالة تأكيد عند النشر/الحجب
- تفعيل جميع الوظائف المطلوبه بلوحة الناظر 
- التحقق من الخطه بعمق شامل ومنهجي 
- تحقق من ان بيئة التطوير والإنتاج  تظهر جميع التعديلات 

### الجزء 4: تحديث الكود الأمامي

1. `**src/hooks/useFiscalYears.ts**`: إضافة حقل `published` لنوع `FiscalYear`
2. `**src/components/FiscalYearSelector.tsx**`: لا يحتاج تعديل لأن الفلترة تتم من قاعدة البيانات عبر RLS - المستفيد لن يرى السنوات المحجوبة أصلاً
3. `**src/contexts/FiscalYearContext.tsx**`: لا يحتاج تعديل - يعمل تلقائياً مع البيانات المفلترة

---

## كيف يعمل النظام

```text
┌─────────────────────────────────────────┐
│         لوحة تحكم الناظر                │
│                                          │
│  سنة 1446-1447هـ  [نشطة] [منشورة] [إقفال]│
│  سنة 1445-1446هـ  [مقفلة] [محجوبة] [نشر] │
│  سنة 1444-1445هـ  [مقفلة] [منشورة] [حجب] │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│         لوحة المستفيد                    │
│                                          │
│  منتقي السنة: [1446-1447هـ ▼]           │
│               [1444-1445هـ   ]           │
│  (سنة 1445-1446 لا تظهر - محجوبة)       │
└─────────────────────────────────────────┘
```

---

## التفاصيل التقنية

### Migration SQL:

```sql
-- 1. Add published column
ALTER TABLE public.fiscal_years
  ADD COLUMN published boolean NOT NULL DEFAULT false;

-- 2. Drop old SELECT policy
DROP POLICY IF EXISTS "Authorized roles can view fiscal_years" ON public.fiscal_years;

-- 3. Admin + Accountant see all
CREATE POLICY "Admins and accountants can view all fiscal_years"
  ON public.fiscal_years FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'accountant')
  );

-- 4. Beneficiary + Waqif see only published
CREATE POLICY "Beneficiaries and waqif can view published fiscal_years"
  ON public.fiscal_years FOR SELECT
  USING (
    published = true AND (
      has_role(auth.uid(), 'beneficiary') OR
      has_role(auth.uid(), 'waqif')
    )
  );
```

### ملفات سيتم تعديلها:


| الملف                                                 | التعديل                          |
| ----------------------------------------------------- | -------------------------------- |
| `src/hooks/useFiscalYears.ts`                         | إضافة `published: boolean` للنوع |
| `src/components/settings/FiscalYearManagementTab.tsx` | إضافة زر نشر/حجب وشارة الحالة    |


### ملفات لا تحتاج تعديل:

- `FiscalYearSelector.tsx` - الفلترة تتم تلقائياً عبر RLS
- `FiscalYearContext.tsx` - يعمل مع البيانات المفلترة تلقائياً
- صفحات المستفيدين - لن ترى السنوات المحجوبة أصلاً