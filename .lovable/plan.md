

# إصلاح تحذير `width(-1) height(-1)` في `CollectionSummaryChart`

## الملخص
مكوّن واحد فقط يحتاج إصلاح: `CollectionSummaryChart.tsx`. أما `CashFlowChartInner.tsx` فهو **مُصلح بالفعل** ويستخدم `useChartReady` + `ready` guard.

## التغيير
**الملف:** `src/components/dashboard/CollectionSummaryChart.tsx`

1. استيراد `useChartReady` من `@/hooks/ui/useChartReady`
2. استدعاء `const { ref, ready } = useChartReady()` داخل المكوّن (قبل guard البيانات الفارغة — لأن hooks لا يمكن استدعاؤها بعد return مبكر)
3. إضافة `ref` على الـ `div` الحاوية
4. لف `ResponsiveContainer` بـ `{ready && (...)}`

```diff
+ import { useChartReady } from '@/hooks/ui/useChartReady';

  const CollectionSummaryChart = (...) => {
+   const { ref, ready } = useChartReady();
    
    if (onTime === 0 && late === 0 && partial === 0) { ... }

    return (
-     <div className="w-[180px] h-[180px] min-h-[180px] shrink-0">
-       <ResponsiveContainer ...>
+     <div ref={ref} className="w-[180px] h-[180px] min-h-[180px] shrink-0">
+       {ready && (
+         <ResponsiveContainer ...>
            ...
-       </ResponsiveContainer>
+         </ResponsiveContainer>
+       )}
      </div>
    );
  };
```

تغيير minimal — لا إعادة هيكلة، نفس النمط المُستخدم في باقي المكونات.

