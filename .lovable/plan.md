

# إصلاحات التقرير الجنائي — AdminDashboard

## التحقق من البنود

| البند | النتيجة | إصلاح؟ |
|-------|---------|--------|
| `.gitignore` سطر مكرر (سطر 34 = نسخة من سطر 32) | **مؤكد** | **نعم** |
| `docs/DATABASE.md` يذكر `security_invoker=on` خطأ (سطر 575) | **مؤكد** | **نعم** |
| `Suspense` بدون `ErrorBoundary` في AdminDashboard | **مؤكد** — 6 مكونات `Suspense` بدون fallback خطأ | **نعم** |
| `security_invoker` على العروض | **محلول في Round 15** | لا |
| `role_permissions` frontend فقط | **مقبول** — RLS يحمي الخادم | لا |
| `window.print()` في AdminDashboard | **مقبول** — لوحة الناظر وليست صفحة مستفيد | لا |

## الإصلاحات — 3 تغييرات في 2 ملفين

### الملف 1: `.gitignore`
إزالة السطر المكرر 34 (`bun.lock`) — موجود بالفعل في سطر 32.

### الملف 2: `docs/DATABASE.md`
سطر 575: تحديث وصف `beneficiaries_safe` — إزالة ذكر `security_invoker=on` واستبداله بالوصف الصحيح:
```
> عرض (View) يُخفي البيانات الحساسة عن الأدوار غير المصرح لها.
> يستخدم `security_barrier=true` مع تقنيع CASE WHEN داخلي.
> الناظر والمحاسب يريان البيانات الكاملة. المستفيد يرى بياناته فقط.
```

### الملف 3: `src/pages/dashboard/AdminDashboard.tsx`
إضافة `ErrorBoundary` حول مكونات `Suspense` الـ lazy-loaded لمنع crash كامل الصفحة عند فشل تحميل chunk:

استيراد `ErrorBoundary` الموجود في المشروع، ثم لف كل `Suspense` بـ `ErrorBoundary`:
```tsx
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary>
  <Suspense fallback={...}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

يُطبَّق على المكونات الخمسة: `CollectionSummaryChart`, `CollectionHeatmap`, `PendingActionsTable`, `DashboardCharts`, `YearOverYearComparison`.

