

# تصحيح منطق الإيرادات — القاعدة: فقط المدفوع فعلاً يُحسب

## فهم القاعدة التجارية

القاعدة واضحة وبسيطة:

1. **الإيرادات = الدخل الفعلي المحصّل** — ما تم سداده فعلاً وتسجيله في جدول `income` هو ما يُحسب
2. **العقد يُرحّل** إذا لم يُسدد بالكامل — الدفعات غير المسددة لا تُحتسب كإيراد
3. **الدفعة المسددة تُحسب كاملة** في السنة المالية التي تم السداد فيها
4. **`allocated_amount` = المتوقع** وليس الإيراد الفعلي — يجب التمييز بوضوح

## التناقض الحالي

```text
بطاقة "الإيرادات التعاقدية" في AdminDashboard (سطر 120):
  contractualRevenue = contracts.reduce(sum + rent_amount)  ← خطأ: القيمة الكاملة

بطاقة "الإيرادات التعاقدية" في ContractsPage (سطر 385):
  totalRent = allocMap.get(c.id) ?? rent_amount  ← خطأ: fallback للقيمة الكاملة

كلاهما لا يعتمد على الدخل الفعلي المحصّل (income)
```

## الحل: بطاقتان منفصلتان بدلاً من خلط المفاهيم

| البطاقة | المصدر | المعنى |
|---------|--------|--------|
| **الإيرادات التعاقدية (المتوقع)** | `allocationMap.allocated_amount` | ما هو مستحق ضمن حدود السنة المالية — بدون fallback |
| **إجمالي الدخل (المحصّل)** | `income` table (موجود أصلاً) | ما تم تحصيله فعلاً |

## التغييرات المطلوبة

### 1. `AdminDashboard.tsx` سطر 120
```text
الحالي:  contractualRevenue = relevantContracts.reduce(sum + rent_amount)
الجديد:  contractualRevenue = relevantContracts.reduce(sum + (allocationMap.get(c.id)?.allocated_amount ?? 0))
```
- استخدام `allocationMap` من `useAccountsData` (موجود أصلاً)
- `?? 0` وليس `?? rent_amount` — إذا لا يوجد تخصيص = 0

### 2. `ContractsPage.tsx` سطر 385-386
```text
الحالي:  totalRent = allocMap.get(c.id) ?? safeNumber(c.rent_amount)
الجديد:  totalRent = allocMap.get(c.id) ?? 0
```
- نفس المنطق: بدون fallback

### 3. `WaqifDashboard.tsx`
- نفس الإصلاح إذا كان يحسب `contractualRevenue` بنفس الطريقة

## أمثلة التحقق

```text
مثال 1: عقد 300K دفعة واحدة، سُدد قبل الإقفال بيوم
  → allocated_amount = 300K (استحقاق ضمن السنة) ✅
  → income = 300K (دفعة مسجلة) ✅

مثال 2: عقد شهري بدأ 10/9/2024، السنة تنتهي 25/10/2024
  → allocated_payments = 1 (شهر واحد ضمن السنة)
  → allocated_amount = rent/12
  → income = مبلغ الدفعة المسددة فقط

مثال 3: مستأجر لم يسدد 3 شهور من 2024
  → allocated_amount = يشمل الـ 3 شهور (متوقع)
  → income = 0 لتلك الأشهر (لم تُدفع)
  → العقد يُرحّل مع فواتيره غير المسددة
```

## الملفات

| الملف | التغيير |
|-------|---------|
| `src/pages/dashboard/AdminDashboard.tsx` | سطر 120: استخدام `allocationMap` بدون fallback |
| `src/pages/dashboard/ContractsPage.tsx` | سطر 385-386: إزالة fallback `?? rent_amount` → `?? 0` |
| `src/pages/beneficiary/WaqifDashboard.tsx` | نفس الإصلاح |

