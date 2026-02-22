
# إصلاح خطأ تسجيل دخول المستفيد - مع تحسين تشخيص الأخطاء

## الشفافية الكاملة

بعد فحص كل ملف في مسار العرض (أكثر من 25 ملفاً)، لم أجد نقطة انهيار واضحة في الكود. السبب: لا أستطيع تسجيل الدخول كمستفيد لرؤية رسالة الخطأ الفعلية في Console. الـ ErrorBoundary الحالي يكتفي بـ `console.error` دون عرض تفاصيل تقنية.

لذلك الخطة تتضمن إصلاحين:
- الأول: إصلاح المشكلة الوحيدة المؤكدة (القيمة الافتراضية الفارغة)
- الثاني: تحسين ErrorBoundary ليعرض تفاصيل الخطأ الحقيقي، فإذا ظهر الخطأ مرة أخرى سنعرف السبب الدقيق

## التعديلات

### 1. إصلاح القيمة الافتراضية - `src/contexts/FiscalYearContext.tsx`
تغيير سطر واحد:
```
// من:
const fiscalYearId = selectedId || activeFY?.id || '';
// إلى:
const fiscalYearId = selectedId || activeFY?.id || 'all';
```
**السبب:** الكود القديم في BeneficiaryDashboard كان يستخدم `'all'` كقيمة افتراضية. بعد الانتقال لـ FiscalYearContext الذي يستخدم `''`، أصبحت القيمة سلسلة فارغة لحظة التحميل الأولى.

### 2. حراسة دفاعية - `src/pages/beneficiary/BeneficiaryDashboard.tsx`
اضافة `Number()` و `|| 0` على القيم المالية قبل عرضها:
```typescript
const safeAvailable = Number(availableAmount) || 0;
const myShare = currentBeneficiary
  ? (safeAvailable * (currentBeneficiary.share_percentage ?? 0)) / 100
  : 0;
```

### 3. تحسين تشخيص الأخطاء - `src/components/ErrorBoundary.tsx`
اضافة عرض رسالة الخطأ الفعلية (اسم الخطأ + الرسالة) على الشاشة عند حدوثه:
```
حدث خطأ غير متوقع
[TypeError: Cannot read properties of undefined (reading 'toLocaleString')]  ← مثال
```
هذا سيكشف الخطأ الحقيقي فوراً إذا ظهر مرة أخرى، بدلاً من التخمين.

## لماذا هذا النهج صادق؟

- الاصلاح الأول يعالج الفرق الملموس الوحيد بين الكود القديم (الذي كان يعمل) والجديد
- الاصلاح الثاني يمنع أي crash محتمل من القيم المالية
- الاصلاح الثالث يضمن أنه إذا ظهر أي خطأ مستقبلي، سنرى السبب الحقيقي على الشاشة فوراً بدلاً من رسالة عامة
