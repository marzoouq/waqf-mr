

# تقرير الفحص الجنائي — التحقق من اكتمال الخطة

---

## البيانات الحية المؤكدة الآن

| الحقيقة | القيمة |
|---------|--------|
| عدد التوزيعات | **14 سجل** |
| `fiscal_year_id` في جميعها | **NULL** ← لم يُصلَح بعد |
| السنة المنشورة | `2024-2025` — `published=true`, `status=closed`, `id=1fe1394b...` |
| السنة النشطة | `2025-2026` — `published=false`, `status=active` |
| `account_fy_id` في جميع التوزيعات | `1fe1394b...` (= السنة المنشورة) |
| Trigger `set_distribution_fiscal_year` | **غير موجود في الإنتاج** — الدالة غير مُنشأة |
| Trigger `trg_set_distribution_fiscal_year` | **غير موجود** — فقط `audit_distributions` و `prevent_closed_fy_distributions` |

---

## حالة الـ Migrations

الملفان موجودان لكن **لم يُطبَّقا** بسبب خطأ "Circuit breaker open" (مشكلة اتصال مؤقتة بقاعدة البيانات).

**المشكلة:** الملف الأول يُنشئ الدالة **والـ Trigger معاً**، والملف الثاني يُعيد إنشاء الدالة فقط (بإضافة `SET search_path`). لكن **لا يوجد ملف يحتوي على M-01** (تصحيح البيانات — UPDATE).

---

## تتبع السيناريو

```text
الحالة الحالية:
  14 توزيع → fiscal_year_id = NULL
  ↓
  is_fiscal_year_accessible(NULL) → false (H-12 fix)
  ↓
  مستفيد يستعلم distributions → 0 صفوف
  ↓
  ❌ بطاقات فارغة + PDF فارغ

بعد تطبيق M-01 (UPDATE):
  14 توزيع → fiscal_year_id = 1fe1394b...
  ↓
  is_fiscal_year_accessible('1fe1394b...') → published=true → true
  ↓
  مستفيد يستعلم distributions → 14 صف
  ↓
  ✅ بطاقات تعرض المبالغ + PDF يتضمن البيانات
```

---

## تقييم اكتمال الخطة

| البند | موجود في الملفات؟ | مطلوب؟ |
|-------|:-:|:-:|
| **M-01: تصحيح البيانات (UPDATE)** | ❌ **مفقود!** | ✅ ضروري |
| **M-03: Trigger (ملف 1)** | ✅ موجود | ✅ تحصين |
| **M-03: SET search_path (ملف 2)** | ✅ موجود | ✅ أمان |
| **M-02: تعديل RLS** | ❌ غير موجود | ✅ صحيح — محذوف عمداً |

### ⚠️ الخطة ناقصة!

**M-01 (تصحيح البيانات)** هو البند الأهم ولم يُضمَّن في أي من الملفين. بدونه:
- الـ Trigger يحمي المستقبل فقط
- الـ 14 سجل الحالية تبقى بـ NULL
- البطاقات تبقى فارغة

---

## الإصلاح المطلوب

### 1. دمج الملفين في migration واحدة تحتوي على:

```sql
-- M-01: تصحيح البيانات الحالية
UPDATE distributions d
SET fiscal_year_id = a.fiscal_year_id
FROM accounts a
WHERE d.account_id = a.id
  AND d.fiscal_year_id IS NULL;

-- M-03: Trigger لمنع NULL مستقبلاً
CREATE OR REPLACE FUNCTION public.set_distribution_fiscal_year()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fiscal_year_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT fiscal_year_id INTO NEW.fiscal_year_id
    FROM public.accounts WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_distribution_fiscal_year
  BEFORE INSERT ON public.distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_distribution_fiscal_year();
```

### 2. حذف الملفين القديمين واستبدالهما بملف واحد

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| حذف `20260322202733_*.sql` | ملف قديم ناقص |
| حذف `20260322202741_*.sql` | ملف مكرر |
| إنشاء migration جديدة | M-01 + M-03 كاملة |

