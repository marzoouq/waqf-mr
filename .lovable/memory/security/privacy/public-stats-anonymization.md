---
name: public-stats-overseer-control
description: تحكم الناظر في إحصائيات صفحة الهبوط (auto/manual/hidden) عبر مفاتيح public_stat_*_mode في app_settings — حلّت محل التقريب القسري السابق
type: feature
---

# تحكم الناظر في إحصائيات صفحة الهبوط

بعد موجة P10، تم استبدال آلية "التقريب القسري لعدد المستفيدين لأقرب 10" (التي كانت بهدف حماية الخصوصية) بآلية تحكم صريحة من الناظر.

## السلوك الجديد لـ `get_public_stats()` RPC

**يقرأ من `app_settings` لكل من الإحصائيات الثلاث**:
- `properties` (عقارات)
- `beneficiaries` (مستفيدون)
- `fiscal_years` (سنوات منشورة)

**المفاتيح لكل إحصائية**:
- `public_stat_<key>_mode`: `auto` | `manual` | `hidden` (افتراضي `auto`)
- `public_stat_<key>_value`: نص الرقم المخصص (يُستخدم فقط عند `manual`)
- `public_stat_<key>_label`: تسمية مخصصة (اختياري — يُستخدم الافتراضي إن فارغ)

**القواعد**:
- `auto` → يُرجَع العدد الحقيقي بدون أي تقريب
- `manual` → يُرجَع `value` كما هو (يقبل أرقام أو نصوص قصيرة مثل `+100`)
- `hidden` → الإحصائية لا تظهر في payload الـ RPC أصلاً (server-side filtering)

## بنية الإرجاع

```json
{ "stats": [{ "key": "properties", "label": "عقار مُدار", "value": "5", "visible": true }, ...] }
```

## واجهة الناظر

`src/components/settings/LandingStatsSettings.tsx` ضمن تبويب "صفحة الهبوط" في الإعدادات.
- 3 بطاقات (واحدة لكل إحصائية)
- Radio: تلقائي / مخصص / إخفاء
- Inputs: رقم مخصص (يظهر عند manual) + تسمية مخصصة (اختياري)
- معاينة فورية + حفظ دفعة واحدة + إبطال cache `public-stats`

## الأمان والخصوصية

- الإخفاء يتم على مستوى الـ RPC (server-side) — لا تسريب للأرقام
- RLS على `app_settings` يضمن أن **الكتابة admin فقط** والقراءة العامة محصورة بمفاتيح غير حساسة
- `GRANT EXECUTE ... TO anon, authenticated` يبقى لأن الإحصائيات عامة بطبيعتها

## ملاحظة على الذاكرة السابقة

ذاكرة `public-stats-anonymization` السابقة (تقريب لـ 10) لم تعد سارية — استُبدلت بهذه الآلية الأكثر مرونة وشفافية.
