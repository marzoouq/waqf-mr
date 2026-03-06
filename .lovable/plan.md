

# خطة: إصلاح الخطأ البرمجي — Circular Import

## المشكلة الجذرية

في التعديل السابق (إصلاح منظومة الخروج)، تم تصدير `queryClient` من `App.tsx` واستيراده في `AuthContext.tsx`. هذا أنشأ **circular dependency**:

```text
App.tsx ──imports──▶ AuthContext.tsx ──imports──▶ App.tsx (دورة!)
```

عند تشغيل التطبيق:
1. `App.tsx` يبدأ التحميل → يحتاج `AuthContext.tsx`
2. `AuthContext.tsx` يبدأ التحميل → يحتاج `queryClient` من `App.tsx`
3. لكن `App.tsx` لم ينتهِ بعد → `queryClient` = `undefined`
4. التطبيق يتعطل على شاشة التحميل

## الحل

**نقل `queryClient` إلى ملف منفصل** `src/lib/queryClient.ts` لكسر الدورة:

### 1. إنشاء `src/lib/queryClient.ts`
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 2. تعديل `src/App.tsx`
- حذف تعريف `queryClient` واستيراده من `@/lib/queryClient`
- حذف `export` الموجود

### 3. تعديل `src/contexts/AuthContext.tsx`
- تغيير الاستيراد من `@/App` إلى `@/lib/queryClient`

## الملفات المتأثرة: 3 ملفات
- `src/lib/queryClient.ts` — ملف جديد
- `src/App.tsx` — استيراد بدل تعريف
- `src/contexts/AuthContext.tsx` — تغيير مسار الاستيراد

