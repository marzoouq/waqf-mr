
## الهدف

إزالة تحذيرات `The width(-1) and height(-1) of chart should be greater than 0` المتكررة في الكونسول عند تحميل `/dashboard/reports` (ولوحات أخرى تستخدم Recharts).

## السبب الجذري

كل مكونات الرسوم تستخدم بالفعل `ChartBox` ← `useChartReady` ← `ResizeObserver` لتأجيل عرض `ResponsiveContainer` حتى تتوفر أبعاد للحاوية. لكن الحارس الحالي ضعيف في حالتين:

1. **العتبة فضفاضة جداً**: الشرط `width > 0 && height > 0` يقبل قيماً جزئية (مثل 0.5px أثناء انتقالات تخطيط Grid)، فيُرندَر `ResponsiveContainer` قبل أن يستقر التخطيط فعلياً، فتقرأ `recharts` `clientWidth = -1` لحظياً.
2. **`obs.disconnect()` بعد أول `ready=true`**: إذا أُعيد تركيب الرسم داخل `TabsContent` أو `Suspense` (lazy + remount)، نفقد التتبّع لإعادة القياسات اللاحقة، وقد تُرندَر بعض الحالات قبل قياس حقيقي.
3. **عدم انتظار إطار رسم**: `setReady(true)` يحدث داخل callback الـ ResizeObserver وقد يتسبب بـ render في نفس الـ tick قبل أن يستقر CSS layout.

## التغييرات

### 1) تحصين `src/hooks/ui/useChartReady.ts`

- رفع العتبة إلى `width >= 2 && height >= 2`.
- تأجيل `setReady(true)` داخل `requestAnimationFrame` لضمان استقرار التخطيط.
- **عدم** فصل `ResizeObserver` بعد أول قياس صالح؛ بدل ذلك حفظ آخر حالة في `useRef` ومنع `setState` المتكرر، مع فصل المراقب في `cleanup` فقط.
- إضافة تحقق أولي متزامن عبر `getBoundingClientRect()` في `useLayoutEffect` للحالات التي تكون فيها الحاوية مرئية فوراً (يقلل وميض "فارغ").

### 2) لا تغييرات على مستوى `ChartBox` ومستهلكيها

`ChartBox` بالفعل يضمن `min-h-[1px]` ويُمرّر `height` ثابتاً (px أو tailwind class أو clamp). الحارس الموحَّد كافٍ لإصلاح جميع الرسوم (Reports/Dashboard/Annual/Waqif/...).

### 3) التحقق

- زيارة `/dashboard/reports` بعد الإصلاح والتحقق من خلو الكونسول من `width(-1) and height(-1)`.
- زيارة `/dashboard` (يحتوي PieChart) للتأكد من عدم ظهور التحذير.
- التحقق من تبديل التبويبات داخل `/dashboard/reports` (الأداء الشهري، التدفق النقدي، المقارنة) — لا يجب أن يظهر التحذير عند الانتقال.
- لقطات شاشة قبل/بعد على عرض 1366×768.

## ملف يتغيّر

```text
src/hooks/ui/useChartReady.ts   (~25 سطراً → ~40 سطراً)
```

## ما هو خارج النطاق

- المشكلة الثانية (شارة "تجاوز 100%" في صفحة المستفيدين عند `100.00%` بالضبط) — أُعالجها في خطة منفصلة عند الطلب.
- لا تغييرات على `recharts`، ولا على ChartBox أو مستهلكيها، ولا على منطق البيانات.

## معايير القبول

- صفر تحذيرات `width(-1) and height(-1)` في الكونسول على الصفحات المختبَرة.
- جميع الرسوم لا تزال تُرندَر بنفس الشكل والأبعاد.
- لا تراجع في أداء أول رسم (TTF chart) ملاحَظ بصرياً.
