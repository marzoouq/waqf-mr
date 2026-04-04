

# خطة تحسين LCP — التنفيذ النهائي (4 تغييرات)

## التغييرات

### 1. تقليل DeferredRender delays في AdminDashboard
**الملف**: `src/pages/dashboard/AdminDashboard.tsx`

5 تعديلات بسيطة:
- سطر 91: `delay={300}` → `delay={0}`
- سطر 101: `delay={500}` → `delay={100}`
- سطر 109: `delay={700}` → `delay={200}`
- سطر 119: `delay={900}` → `delay={300}`
- سطر 124: `delay={1100}` → `delay={400}`

### 2. Early return للمستخدمين المسجّلين في Index.tsx
**الملف**: `src/pages/Index.tsx`

إضافة early return بعد الـ hooks وقبل JSX الرئيسي — إذا المستخدم مسجّل وليس في حالة تحميل، نعرض spinner بسيط بدل رندر كامل Landing Page:
```tsx
if (!loading && user) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```
يتطلب إضافة `import { Loader2 } from 'lucide-react'`.

### 3. Prefetch بيانات dashboard-summary في FiscalYearContext
**الملف**: `src/contexts/FiscalYearContext.tsx`

إضافة `useEffect` بعد حساب `fiscalYearId` (سطر ~63) يستدعي `queryClient.prefetchQuery` فور جاهزية السنة المالية. سيستخدم نفس `queryKey` و `queryFn` الموجودة في `useDashboardSummary` لضمان cache hit عند وصول الـ Dashboard:

```tsx
const queryClient = useQueryClient();

useEffect(() => {
  if (isFyReady(fiscalYearId) && !isFyAll(fiscalYearId)) {
    const fy = fiscalYears.find(f => f.id === fiscalYearId);
    queryClient.prefetchQuery({
      queryKey: ['dashboard-summary', fiscalYearId],
      queryFn: async () => {
        const { data, error } = await supabase.functions.invoke('dashboard-summary', {
          body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fy?.label },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      },
      staleTime: 2 * 60 * 1000,
    });
  }
}, [fiscalYearId, fiscalYears, queryClient]);
```

Imports المطلوبة: `useQueryClient` من tanstack، `supabase` من client.

### 4. تقليل delay الـ AiAssistant في App.tsx
**الملف**: `src/App.tsx` سطر ~59

تغيير `<DeferredRender>` إلى `<DeferredRender delay={200}>` في `RoleGatedAiAssistant`.

## الملفات المتأثرة
1. `src/pages/dashboard/AdminDashboard.tsx` — تعديل 5 قيم delay
2. `src/pages/Index.tsx` — إضافة early return + import
3. `src/contexts/FiscalYearContext.tsx` — إضافة prefetch useEffect + imports
4. `src/App.tsx` — إضافة `delay={200}`

## النتيجة المتوقعة
LCP: ~3300ms → ~1800-2000ms

