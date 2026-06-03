## النتيجة بعد الفحص العميق

الخطة السابقة منفّذة 22/33 بنداً ✅. تبقّت 4 ثغرات حقيقية تؤثر على سلامة البيانات وانعكاس التحديث على لوحات التحكم.

---

## الثغرات المكتشفة

### ❌ 1) سباق تزامن في trigger التداخل
`prevent_fiscal_year_overlap` (PLPGSQL) لا يقفل الصفوف عند القراءة. عند إدخال متوازٍ من جلستين، **قد تمر سنتان متداخلتان معاً**. الخطة الأصلية نصّت على `EXCLUDE USING gist` لكن لم يُنفَّذ.

### ⚠️ 2) `waqif_annual_report` queryKey وهمي
مُدرَج في invalidation realtime + غير مستهلك في أي hook → إبطال بدون أثر.

### ⚠️ 3) `PUBLISH_INVALIDATION_KEYS` ناقص
عند نشر/حجب سنة من تبويب المدير، لوحة الواقف لا تُبطَل فوراً (تنتظر حدث realtime).

### ❌ 4) لا اختبارات UI لـ `FiscalYearManagementTab`
الخطة الأصلية طلبت `FiscalYearManagementTab.test.tsx` ولم يُنشأ.

### ⚠️ 5) سيناريو حذف+إعادة إنشاء بنفس التاريخ
**يعمل حالياً** (لا قيود معلّقة)، لكن سنُضيف اختبار E2E يُثبته صراحةً.

---

## بنود التنفيذ

### 1) Migration: استبدال trigger بـ EXCLUDE constraint ذرّي

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- إزالة trigger القديم (لا يحمي من السباقات)
DROP TRIGGER IF EXISTS trg_prevent_fiscal_year_overlap ON public.fiscal_years;
DROP FUNCTION IF EXISTS public.prevent_fiscal_year_overlap();

-- قيد ذرّي على مستوى الفهرس
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_no_overlap
  EXCLUDE USING gist (daterange(start_date, end_date, '[]') WITH &&);
```

### 2) `fiscalYearService.ts` — تحسين رسالة 23P01

بعد التقاط `23P01`، نُجري استعلام `daterange && daterange` لاسترجاع السنة المتعارضة فعلياً (الاسم + الفترة) ونُركّبها في الرسالة:

```ts
if (error.code === '23P01') {
  const { data: overlap } = await supabase
    .from('fiscal_years')
    .select('label,start_date,end_date')
    .or(`and(start_date.lte.${input.end_date},end_date.gte.${input.start_date})`)
    .maybeSingle();
  throw new Error(
    overlap
      ? `يوجد تداخل زمني مع السنة "${overlap.label}" (${overlap.start_date} → ${overlap.end_date})`
      : 'يوجد تداخل زمني مع سنة مالية أخرى'
  );
}
```

### 3) `useFiscalYearManagement.ts` — إضافة `waqif_annual_report`

```ts
const PUBLISH_INVALIDATION_KEYS = [
  ['fiscal_years'],
  ['fiscal_years_published_all'],
  ['public-stats'],
  ['annual_report_status'],
  ['annual_report_items'],
  ['waqif_annual_report'],   // ← جديد
];
```

### 4) `FiscalYearContext.tsx` — تنظيف المفتاح الوهمي

نُبقي `['waqif_annual_report']` فقط إذا أنشأنا hook يستهلكه، وإلا نحذفه. **الإجراء**: حذفه من `extraKeys` لتجنب الإبطال الزائف، وإضافة TODO في كومنت لاستهلاكه عند بناء تقرير الواقف السنوي.

### 5) ملف اختبار جديد: `FiscalYearManagementTab.test.tsx`

سيناريوهات RTL:
1. label `25-26` → خطأ inline + زر "إنشاء" معطّل + لا استدعاء service
2. label `٢٠٢٥-٢٠٢٦` + تواريخ صحيحة → يمرّ التطبيع والإنشاء
3. mock `createFiscalYear` يرمي `يوجد تداخل زمني مع السنة "2024-2025"...` → `<Alert variant="destructive">` يعرض النص حرفياً
4. تحديث `useFiscalYears` (محاكاة realtime) → الجدول يُعاد عرضه بدون reload
5. زر حذف معطّل للسنة `active`

### 6) توسيع `fiscalYearService.test.ts`

- اختبار جديد: بعد محاكاة DELETE، `checkFiscalYearConflicts` بنفس التاريخ يُعيد `null` → الإنشاء مقبول
- اختبار: `23P01` mock يُرجع رسالة بالاسم والفترة بعد استعلام `findOverlappingYear`

---

## مصفوفة التحقق

- `bunx vitest run` → كل الاختبارات الحالية (34) + الجديدة (~6) تمر
- على DB بعد migration:
  - `INSERT` متداخل عبر `supabase--read_query` → يفشل برسالة 23P01 من EXCLUDE constraint
  - حذف 2024-2025 ثم INSERT بنفس التاريخ → ينجح
- يدوي على `/dashboard/settings?tab=fiscal`:
  - تعديل/حذف سنة من تبويب آخر → الجدول + شريط التنبيه + لوحات (admin/accountant/beneficiary) تتحدث فوراً
  - نشر/حجب سنة → لوحة الواقف والمستفيد تتحدثان فوراً (دون انتظار realtime)
- على `/dashboard/audit-log` — العمليات تظهر مع diff كامل

---

## الملفات المتأثرة

**جديد:**
- `supabase/migrations/<ts>_fiscal_years_exclude_gist.sql`
- `src/components/settings/fiscal-year/FiscalYearManagementTab.test.tsx`

**تعديل:**
- `src/lib/services/fiscalYearService.ts` (دالة `findOverlappingYear` + استدعاؤها في catch 23P01)
- `src/lib/services/fiscalYearService.test.ts` (سيناريوهات إضافية)
- `src/hooks/page/admin/financial/useFiscalYearManagement.ts` (إضافة `waqif_annual_report`)
- `src/contexts/FiscalYearContext.tsx` (حذف المفتاح الوهمي + TODO)

**غير متأثر:** ملفات المصادقة، RLS policies، types.ts، client.ts، config.toml.
