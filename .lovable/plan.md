
# خطة إصلاح: إخفاء حصة الناظر والواقف من واجهة المستفيد + تصحيح حساب الحصة

## ملخص المشاكل

1. **حصة الناظر وحصة الواقف وريع الوقف ورقبة الوقف** تظهر للمستفيد في صفحة الإفصاح السنوي ورسم التقارير المالية
2. **حساب الحصة خاطئ** في MySharePage و DisclosurePage و FinancialReportsPage بسبب RLS - المستفيد يرى سجله فقط فيصبح `totalBeneficiaryPercentage` = نسبته الشخصية بدل 100
3. **بطاقة "إجمالي ريع الوقف"** في لوحة التحكم تكشف المبلغ الكامل قبل التوزيع
4. **رسم "توزيع الريع"** في التقارير يعرض حصص الناظر والواقف

---

## المهام

### المهمة 1: إنشاء دالة SQL آمنة لمجموع نسب المستفيدين

إنشاء دالة `get_total_beneficiary_percentage()` من نوع `SECURITY DEFINER` تُرجع مجموع نسب جميع المستفيدين متجاوزة RLS. هذا يحل السبب الجذري لخطأ الحساب.

### المهمة 2: تصحيح حساب الحصة في 3 صفحات

- **BeneficiaryDashboard.tsx** (سطر 36): يقسم على 100 مباشرة - يجب استبداله باستدعاء الدالة الجديدة
- **MySharePage.tsx** (سطر 80): يحسب `totalBeneficiaryPercentage` من `beneficiaries` المحلية (سجل واحد بسبب RLS)
- **DisclosurePage.tsx** (سطر 70): نفس المشكلة
- **FinancialReportsPage.tsx** (سطر 61): نفس المشكلة
- **AdvanceRequestDialog.tsx**: التحقق من نفس المشكلة

سيتم إنشاء hook مشترك `useTotalBeneficiaryPercentage()` يستدعي الدالة الجديدة ويُستخدم في جميع الصفحات.

### المهمة 3: إخفاء البيانات المالية الداخلية من صفحة الإفصاح

**الملف:** `DisclosurePage.tsx`

إزالة الأسطر التالية من التسلسل المالي:
- حصة الناظر (سطر 463-466)
- حصة الواقف (سطر 467-470)
- ريع الوقف (سطر 471-474)
- رقبة الوقف (سطر 475-479)

الانتقال مباشرة من "الصافي بعد الزكاة" إلى "الإجمالي القابل للتوزيع" وحصة المستفيد.

### المهمة 4: تعديل لوحة تحكم المستفيد

**الملف:** `BeneficiaryDashboard.tsx`

تغيير بطاقة "إجمالي ريع الوقف" (سطر 226-243) لتعرض معلومة مفيدة للمستفيد بدلا من المبلغ الكامل، مثل "إجمالي المستلم" أو "عدد التوزيعات".

### المهمة 5: تعديل رسم توزيع الريع في التقارير المالية

**الملف:** `FinancialReportsPage.tsx`

إزالة حصص الناظر والواقف من رسم "توزيع الريع" (سطر 76-80). إما:
- إزالة الرسم بالكامل
- أو استبداله برسم يعرض فقط حصة المستفيد الحالي مقابل باقي المستفيدين

وكذلك إزالة `adminShare` و `waqifShare` من تقرير PDF المُصدّر (سطر 105-107).

### المهمة 6: تنظيف تقارير PDF

**الملف:** `comprehensiveBeneficiary.ts`

إزالة من القسم الخامس "التسلسل المالي":
- سطور حصة الناظر وحصة الواقف وريع الوقف ورقبة الوقف
- الإبقاء فقط على: الدخل، المصروفات، الضريبة، الزكاة، ثم المبلغ القابل للتوزيع وحصة المستفيد

---

## التفاصيل التقنية

### دالة SQL الجديدة
```text
CREATE OR REPLACE FUNCTION public.get_total_beneficiary_percentage()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(share_percentage), 0)
  FROM public.beneficiaries
$$;
```

### Hook جديد
```text
// src/hooks/useTotalBeneficiaryPercentage.ts
// يستدعي supabase.rpc('get_total_beneficiary_percentage')
// يُرجع الرقم الحقيقي (مثلا 100) بدل الرقم المحلي
```

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| SQL Migration | إنشاء `get_total_beneficiary_percentage` |
| `useTotalBeneficiaryPercentage.ts` | Hook جديد |
| `BeneficiaryDashboard.tsx` | استخدام Hook + تغيير بطاقة الريع |
| `MySharePage.tsx` | استبدال الحساب المحلي بالـ Hook |
| `DisclosurePage.tsx` | استبدال الحساب + إخفاء 4 سطور |
| `FinancialReportsPage.tsx` | استبدال الحساب + إزالة رسم التوزيع |
| `comprehensiveBeneficiary.ts` | إزالة بنود داخلية من PDF |
| `AdvanceRequestDialog.tsx` | التحقق وتصحيح الحساب إن لزم |
