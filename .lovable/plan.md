## الهدف

تحويل التحقق من السنوات المالية إلى طبقات صارمة: قاعدة بيانات (مصدر الحقيقة) + تحقق محلي فوري + رسائل خطأ حرفية inline + انعكاس realtime على كل لوحات التحكم + اختبارات RTL.

---

## سيناريو حذف 2024-2025 ثم إعادة إنشاء بنفس التاريخ

**يجب أن يُقبل** — وقد تحققت من ذلك ضد الخطة:
1. الحذف يُزيل السطر فعلياً → trigger التداخل لا يجد مطابقاً.
2. `UNIQUE(label)` يتحرّر تلقائياً.
3. الفهرس الفريد `WHERE status='active'` يتحرّر.
4. realtime يبثّ حدث DELETE → كل اللوحات تُحدِّث الكاش → النموذج يُعيد الفحص بدون باقي تالف.

---

## مشاكل في الخطة السابقة تم تصحيحها

### أ) استبدال trigger التداخل بـ EXCLUDE constraint (آمن من السباقات)

trigger الـPLPGSQL **عرضة لسباقات** عند INSERT متزامن من جلستين (لا يقفل الصفوف الأخرى). البديل الذرّي:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_no_overlap
  EXCLUDE USING gist (
    daterange(start_date, end_date, '[]') WITH &&
  );
```

عند الانتهاك تُعيد Postgres الخطأ: `conflicting key value violates exclusion constraint "fiscal_years_no_overlap"`. نُغلِّفها برسالة عربية واضحة عبر دالة wrapper تُلتقط في خدمة `createFiscalYear`:

```ts
// في fiscalYearService.ts catch block
if (error.code === '23P01') {
  // ابحث عن السنة المتعارضة لإظهار اسمها
  const overlap = await findOverlappingYear(input);
  throw new Error(`يوجد تداخل زمني مع السنة "${overlap?.label}" (${overlap?.start_date} → ${overlap?.end_date})`);
}
```

### ب) UNIQUE(label) — معالجة كود الخطأ 23505

نلتقط `error.code === '23505'` ونُحوّله لرسالة `يوجد سنة مالية بنفس المسمى "${input.label}"`.

### ج) الفهرس الفريد على active

الصيغة الصحيحة في Postgres:
```sql
CREATE UNIQUE INDEX fiscal_years_one_active_idx
  ON public.fiscal_years (status)
  WHERE status = 'active';
```
(الأقواس المضاعفة `((status))` غير لازمة لعمود واحد.)

### د) Realtime — لم يُضَف فعلياً في الجولة السابقة (يجب التأكيد)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_years;
ALTER TABLE public.fiscal_years REPLICA IDENTITY FULL;
```

وفي `FiscalYearProvider`:
```ts
const { user, role } = useAuth();
useDashboardRealtime(
  'fiscal-years-global',
  ['fiscal_years'],
  !!user && !!role,
  [
    ['fiscal_years_published_all'],
    ['public-stats'],
    ['annual_report_status'],
    ['waqif_annual_report'],
  ],
);
```

**ملاحظة على حدث DELETE والمستفيد/الواقف:** RLS يفلتر الأحداث الواردة. إن كانت السنة المحذوفة `published=true`، يستلم المستفيد حدث DELETE ويُحدّث `fiscal_years_published_all`. إن كانت محجوبة، لا حدث له — لكن لا يهم لأنه لم يكن يراها أصلاً.

### هـ) تنظيف `submitError` عند تغيير الحقول

```ts
useEffect(() => { setSubmitError(null); }, [newFY.label, newFY.start_date, newFY.end_date]);
```

### و) مخاطر migration على البيانات الحالية

تحققت: يوجد سنة واحدة `2024-2025` (`2024-10-25 → 2025-10-24`). لا تعارض مع أي constraint جديد ✓.

---

## بنود التنفيذ النهائية

### 1) Migration واحدة موحّدة

```sql
-- 1. UNIQUE label
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_label_unique UNIQUE (label);

-- 2. CHECK start<end
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_dates_valid CHECK (start_date < end_date);

-- 3. سنة active واحدة
CREATE UNIQUE INDEX fiscal_years_one_active_idx
  ON public.fiscal_years (status) WHERE status = 'active';

-- 4. منع التداخل (ذرّي)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_no_overlap
  EXCLUDE USING gist (daterange(start_date, end_date, '[]') WITH &&);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_years;
ALTER TABLE public.fiscal_years REPLICA IDENTITY FULL;
```

### 2) `fiscalYearService.ts`
- تطبيع الأرقام العربية في `label` عبر `normalizeArabicDigits` قبل regex.
- في `createFiscalYear` التقاط `error.code`:
  - `23P01` → استعلام للسنة المتعارضة → رسالة بالاسم والفترة
  - `23505` على فهرس label → رسالة "بنفس المسمى"
  - `23505` على فهرس active → رسالة "يوجد سنة نشطة"
  - `23514` (CHECK) → رسالة "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"

### 3) `useFiscalYearManagement.ts`
- `formError: string | null` عبر `useMemo` يستدعي `validateFiscalYearInput`.
- `submitError: string | null` يُملأ في catch ويُمسح في useEffect عند تغيير الحقول.
- `handleCreate` يعيد فوراً عند `formError`.

### 4) `FiscalYearManagementTab.tsx`
- زر إنشاء `disabled={!!formError || actionLoading==='create'}`.
- `<Alert variant="destructive">` عند `submitError` يعرض النص حرفياً.
- رسائل inline تحت كل حقل من `formError` (label/dates/duration).

### 5) `FiscalYearContext.tsx`
- إضافة `useDashboardRealtime` كما أعلاه (إن لم يكن مضافاً).

### 6) اختبارات

**ملف جديد:** `src/components/settings/fiscal-year/FiscalYearManagementTab.test.tsx`
1. `label="25-26"` → inline error + زر معطّل + لا استدعاء
2. `label="٢٠٢٥-٢٠٢٦"` → يُقبل (تطبيع)
3. mock يرمي رسالة التداخل الحرفية → `<Alert>` يظهرها
4. mock يحدّث `useFiscalYears` (محاكاة realtime) → الجدول يتحدّث بدون reload

**توسيع `fiscalYearService.test.ts`:**
- `normalizeArabicDigits` على label عربي
- محاكاة `error.code='23P01'` → رسالة عربية صحيحة
- سيناريو الحذف ثم إعادة الإنشاء بنفس التاريخ (mock): `checkFiscalYearConflicts` يعود `null`

---

### مصفوفة التحقق النهائية

- `bunx vitest run` — كل الاختبارات + الجديدة تمر
- بعد migration: `INSERT` متداخل عبر `supabase--read_query` يفشل برسالة 23P01
- `DELETE` للسنة الوحيدة ثم `INSERT` بنفس التاريخ ينجح
- يدوي على `/dashboard/settings?tab=fiscal`:
  - `label='25-26'` → خطأ inline + زر معطّل
  - `label='٢٠٢٥-٢٠٢٦'` → يُقبل
  - تداخل → Alert بنص: `يوجد تداخل زمني مع السنة "2024-2025" (2024-10-25 → 2025-10-24)`
  - حذف 2024-2025 ثم إنشاء بنفس التاريخ → ينجح ويظهر في كل اللوحات
  - تعديل/حذف من تبويب آخر → الجدول وشريط التنبيه ولوحات الناظر/المستفيد تتحدث فوراً بلا refresh
- `/dashboard/audit-log` — العمليات تظهر مع diff

---

### الملفات المتأثرة

**جديد:**
- `supabase/migrations/<ts>_fiscal_years_constraints_realtime.sql`
- `src/components/settings/fiscal-year/FiscalYearManagementTab.test.tsx`
- `src/lib/services/fiscalYearService.test.ts`

**تعديل:**
- `src/lib/services/fiscalYearService.ts`
- `src/hooks/page/admin/financial/useFiscalYearManagement.ts` (+ توسيع اختباره)
- `src/components/settings/fiscal-year/FiscalYearManagementTab.tsx`
- `src/contexts/FiscalYearContext.tsx`
