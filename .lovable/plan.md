

# خطة تحسين أداء التحميل الأولي

## التغييرات المطلوبة

### 1. تحميل صفحة Index بشكل فوري (Eager Import)
**الملف**: `src/routes/publicRoutes.tsx`

صفحة الهبوط (`/`) هي أول ما يراه المستخدم — تحميلها lazily يضيف round-trip إضافي. نحوّلها إلى eager import مباشر.

```typescript
// قبل
const Index = lazyWithRetry(() => import("@/pages/Index"));

// بعد
import Index from "@/pages/Index";
```

### 2. تحميل صفحة Auth بشكل فوري
**الملف**: `src/routes/publicRoutes.tsx`

صفحة المصادقة هي ثاني أكثر صفحة يصل إليها المستخدم مباشرة — تحميلها eager يزيل تأخير الانتقال من Landing إلى Login.

```typescript
import Auth from "@/pages/Auth";
```

### 3. فصل ProtectedRoute و RequireBeneficiarySection إلى lazy import
**الملفات**: `src/routes/adminRoutes.tsx` و `src/routes/beneficiaryRoutes.tsx`

حالياً `ProtectedRoute` و `RequireBeneficiarySection` يُستوردان eagerly في ملفات المسارات المحمية — لكن هذه المسارات لا تُزار إلا بعد تسجيل الدخول. تحويلهما إلى lazy يقلل الحزمة الأولية.

**adminRoutes.tsx:**
```typescript
// قبل
import ProtectedRoute from "@/components/ProtectedRoute";

// بعد
const ProtectedRoute = lazyWithRetry(() => import("@/components/ProtectedRoute"));
```

**beneficiaryRoutes.tsx:**
```typescript
const ProtectedRoute = lazyWithRetry(() => import("@/components/ProtectedRoute"));
const RequireBeneficiarySection = lazyWithRetry(() => import("@/components/RequireBeneficiarySection"));
```

### 4. إضافة Prefetch للصفحات الأكثر زيارة بعد الإقلاع
**الملف**: `src/routes/publicRoutes.tsx`

بعد تحميل Landing بنجاح، نبدأ prefetch لـ Auth و AdminDashboard في وقت الخمول:

```typescript
// تحميل مسبق في وقت خمول المتصفح
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => {
    import("@/pages/dashboard/AdminDashboard");
  });
}
```

## الملفات المتأثرة
- `src/routes/publicRoutes.tsx` — eager import لـ Index و Auth + prefetch
- `src/routes/adminRoutes.tsx` — lazy import لـ ProtectedRoute
- `src/routes/beneficiaryRoutes.tsx` — lazy import لـ ProtectedRoute و RequireBeneficiarySection

## النتيجة المتوقعة
- تقليل وقت First Contentful Paint بإزالة round-trip تحميل chunk لصفحة الهبوط
- تقليل حجم الحزمة الأولية بنقل ProtectedRoute خارج الحزمة الأساسية
- تحسين الانتقال إلى Auth بإلغاء التأخير

