## المشكلة المؤكَّدة

في `/beneficiary/expenses` تظهر بطاقة "توزيع المصروفات حسب النوع" مع عنوانها فقط، والمحتوى أسفلها فارغ تماماً (≈280px فراغ أبيض)، رغم وجود 13 مصروفاً بقيمة 121,722 ر.س في الملخص أعلاه.

### الجذر التشخيصي (من console)

`recharts` يطلق التحذير المتكرر:
```
The width(-1) and height(-1) of chart should be greater than 0
```
وهذا يصدر من `ResponsiveContainer` داخل `ExpensePieChartInner` لأنه يُركَّب قبل أن تستقر أبعاد الحاوية الفعلية، ثم ResizeObserver الداخلي لـ recharts لا يلتقط التحديث بسبب التتابع التالي:

1. `<Suspense fallback={Skeleton h-[250px]}>` → كسر طول الحاوية أثناء التبديل.
2. `LazyPieChart` يُركَّب فيُنشئ `<div h-[280px]>` ثم `useChartReady` يضع `ready=true` عبر `requestAnimationFrame`.
3. `ResponsiveContainer` يُركَّب في نفس tick، يستدعي قياسه الأول فيعود `-1, -1`، ثم لا يُعاد القياس لأن العنصر لم يتغير حجمه بعد ذلك (ResizeObserver لا يطلق initial event ثانياً).

النتيجة: الـ SVG لا يُرسم أبداً.

نفس المشكلة موجودة على `/dashboard/expenses` لأن كلاهما يستخدم `ExpensePieChartInner` المشترك — لكن الإصلاح **لن يلمس** أي ملف خارج الرسم الدائري.

## الإصلاح الجراحي (ملف واحد)

### `src/components/expenses/ExpensePieChartInner.tsx`

استبدال نمط `useChartReady` + `ResponsiveContainer` بـ:

- استخدام `useChartReady` كما هو لجلب أبعاد الحاوية، **لكن تمرير القياسات الفعلية إلى `<PieChart width=… height=…>` مباشرة** بدون `ResponsiveContainer`.
- هذا يضمن أن recharts لا يرسم أبداً بأبعاد `-1`، ويُعيد الرسم تلقائياً عند تغيُّر القياس عبر ResizeObserver الموجود مسبقاً في `useChartReady`.

تعديل `useChartReady` بشكل غير كاسر: إضافة قياس `{ width, height }` للقيمة المُرجَعة (بقيم افتراضية تحافظ على التوافق الخلفي مع المستهلكين الحاليين الذين يستخدمون `ready` فقط). لن تتأثر `DashboardChartsInner`/`FinancialChartsInner`/`WaqifChartsInner` لأنها لا تقرأ `width/height`.

### نقاط التحقق

1. فحص بصري على `/beneficiary/expenses` و `/dashboard/expenses`: ظهور الدائرة والـ Legend وأسماء الأنواع.
2. اختفاء تحذير `width(-1) and height(-1)` من console.
3. عدم وجود انحدار في باقي الرسوم البيانية (Dashboard/Financial/Waqif).
4. `bun run test` للتأكد من عدم كسر اختبارات الـ chart hooks.

## ما لن أعدّله

- لن أمسّ `ExpensesPieChart.tsx` الخارجي (منطق التجميع سليم).
- لن أمسّ `useExpensesViewPage` ولا `ExpensesViewPage.tsx` ولا الصفحة الأم.
- لن أمسّ بقية الرسوم البيانية التي تستخدم `useChartReady` (التغيير متوافق رجعياً).
- لن أحذف `useChartReady` ولا أغيّر استراتيجيتها الأساسية.
