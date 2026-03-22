

# تقرير الفحص الجنائي لسكريبت الترحيل

---

## الحالة الحالية في الإنتاج (مؤكدة الآن)

### القسم 1: app_settings
**جميع القيم موجودة بالفعل ومطابقة تماماً لما في السكريبت.**

لا حاجة لتشغيل أوامر UPDATE في القسم 1 — ستُعيد كتابة نفس البيانات دون تغيير فعلي. والإعدادات الإضافية (INSERT ON CONFLICT DO NOTHING) موجودة أيضاً بالفعل.

| البند | الحالة |
|-------|--------|
| هوية الوقف (الاسم، المؤسس، الناظر...) | ✅ مطابقة |
| النسب المالية (10%, 5%) | ✅ مطابقة |
| البانر | ✅ مطابقة |
| صلاحيات الأدوار | ✅ مطابقة |
| الإعدادات الاختيارية | ✅ موجودة |

### القسم 2: account_categories
**جميع الـ 16 فئة موجودة بنفس الـ UUIDs.** INSERT ON CONFLICT DO NOTHING لن يُغيّر شيئاً.

### القسم 3: Cron Jobs
**يجب تشغيله فقط إذا لم تكن المهام موجودة.** تشغيله مرة ثانية قد يسبب خطأ تكرار أو إنشاء نسخ مكررة. يجب التحقق أولاً من `cron.job`.

### القسم 4: مزامنة عكسية
مجرد تعليقات — لا يتم تنفيذها في Live.

### القسم 5: Storage
تعليمات يدوية — لا SQL.

---

## ⚠️ المشكلة الحرجة المكتشفة

**`distributions.fiscal_year_id` لا يزال NULL في 14 سجل** — هذا هو السبب الجذري لاختفاء بطاقات المستفيد.

**هذا السكريبت لا يحتوي على إصلاح التوزيعات!**

كما أن **Realtime publication** لا تزال ناقصة — فقط `notifications`, `conversations`, `messages` مضافة. الجداول المالية (`accounts`, `income`, `expenses`, `payment_invoices`) غير مضافة.

---

## التوصية

### لا تشغّل هذا السكريبت كاملاً — معظمه مطبّق بالفعل

### بدلاً من ذلك، شغّل الأوامر التالية فقط في Cloud View → Run SQL → Live:

#### 1) إصلاح التوزيعات (الأولوية القصوى)
```sql
ALTER TABLE public.distributions DISABLE TRIGGER prevent_closed_fy_distributions;

UPDATE public.distributions d
SET fiscal_year_id = a.fiscal_year_id
FROM public.accounts a
WHERE d.account_id = a.id
  AND d.fiscal_year_id IS NULL;

ALTER TABLE public.distributions ENABLE TRIGGER prevent_closed_fy_distributions;
```

#### 2) تفعيل Realtime للجداول المالية
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_invoices;
```

#### 3) التحقق من Cron Jobs قبل إضافتها
```sql
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
```
إذا كانت فارغة، شغّل القسم 3 من السكريبت. إذا كانت موجودة، تجاهله.

#### 4) التحقق بعد التنفيذ
```sql
SELECT count(*) FILTER (WHERE fiscal_year_id IS NULL) as still_null
FROM distributions;
-- يجب أن يكون = 0
```

---

## ملخص

| البند | الحالة | الإجراء |
|-------|--------|---------|
| app_settings | ✅ مطبّق | لا شيء |
| account_categories | ✅ مطبّق | لا شيء |
| distributions fix | ❌ **ناقص** | **نفّذ أمر 1** |
| Realtime | ❌ **ناقص** | **نفّذ أمر 2** |
| Cron Jobs | ⚠️ تحقق أولاً | **نفّذ أمر 3 ثم قرر** |
| Storage | يدوي | ارفع الملفات يدوياً |

