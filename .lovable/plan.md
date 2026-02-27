

# تحديث خطة المشروع وتوثيق قاعدة البيانات

## نظرة عامة
تحديث ملف الخطة بملاحظة `.limit(500)` وإصلاح نقص التوثيق في `docs/DATABASE.md`. يشمل اضافة 3 اعمدة مفقودة لجدول `accounts` وعمود `published` لجدول `fiscal_years`.

---

## التغيير 1: تحديث `.lovable/plan.md`

### 1a. اضافة ملاحظة بعد الخطوة 3 (سطر 31)

```text
> ملاحظة: `.limit(500)` لم يُضَف على `useUnits` (المُفلتر) — لكن هذا مقبول لان الاستعلام مُقيّد بـ `property_id` واحد فعلياً، مما يجعل النتائج محدودة بطبيعتها.
```

### 1b. اضافة خطوة 6 جديدة قبل قسم "ملاحظة: بنود مستبعدة"

```text
## الخطوة 6: توثيق الاعمدة المفقودة في `docs/DATABASE.md`

اضافة 3 اعمدة مفقودة لجدول `accounts` (في الجدول النصي + كتلة Mermaid) وعمود `published` لجدول `fiscal_years`.
```

### 1c. تحديث قسم "الملفات المتاثرة" لاضافة `docs/DATABASE.md`

---

## التغيير 2: `docs/DATABASE.md` — جدول `accounts`

### 2a. كتلة Mermaid (سطر 120)

اضافة 3 حقول قبل `}` الاغلاق:

```text
        numeric net_after_expenses
        numeric net_after_vat
        numeric waqf_capital
```

### 2b. الجدول النصي (سطر 292)

اضافة 3 صفوف بعد `distributions_amount`:

```text
| `net_after_expenses` | numeric | صافي الدخل بعد المصروفات |
| `net_after_vat` | numeric | صافي الدخل بعد الضريبة |
| `waqf_capital` | numeric | راس مال الوقف |
```

---

## التغيير 3: `docs/DATABASE.md` — جدول `fiscal_years`

### سطر 318

اضافة عمود `published` بعد `status`:

```text
| `published` | boolean | هل السنة منشورة للمستفيدين |
```

---

## التحقق من الاخطاء الاملائية

تم فحص جميع اسماء الاعمدة مقابل `src/integrations/supabase/types.ts` (المُولّد تلقائياً من قاعدة البيانات):

| العمود في الخطة | العمود في `types.ts` | النتيجة |
|---|---|---|
| `waqf_corpus_manual` | `waqf_corpus_manual` | مطابق |
| `distributions_amount` | `distributions_amount` | مطابق |
| `net_after_expenses` | `net_after_expenses` | مطابق |
| `net_after_vat` | `net_after_vat` | مطابق |
| `waqf_capital` | `waqf_capital` | مطابق |
| `published` | `published` | مطابق |

لا توجد اخطاء املائية.

---

## بنود مكتشفة خارج نطاق هذه الخطة

الفحص كشف 5 جداول كاملة غائبة من التوثيق (`access_log_archive`, `advance_carryforward`, `advance_requests`, `webauthn_challenges`, `webauthn_credentials`) واعمدة مفقودة من جداول `contracts` و `invoices`. هذه تتطلب خطة منفصلة لتحديث التوثيق الشامل.

---

## الملفات المتاثرة
1. `.lovable/plan.md` (تغيير 1)
2. `docs/DATABASE.md` (تغييرات 2 + 3)

