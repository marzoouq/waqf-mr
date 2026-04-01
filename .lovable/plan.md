

# تقرير الفحص الجنائي — تحقق بند ببند من الكود الفعلي

## ✅ عائق #1: `runPwaCacheGuard()` قبل React render — مُؤكَّد

**الملف**: `src/main.tsx` سطر 23
**الكود الفعلي**:
```text
سطر 23: runPwaCacheGuard();        ← يعمل هنا
سطر 28: createRoot(rootEl).render(  ← React يبدأ بعده
```
**التحقق من `pwaBootstrap.ts`**: الدالة `async` وقد تستدعي `window.location.reload()` (سطر 43 و 72) — إذا حدث reload يتجمد كل شيء حتى إعادة التحميل الكاملة.
**ملاحظة**: الدالة `async` لكن تُستدعى بدون `await`، لذا في الحالة العادية لا تحجب. لكن إذا وصلت لـ `reload()` قبل render، لن يظهر أي شيء.
**الإصلاح**: نقل السطر 23 ليكون بعد سطر 32 (بعد render).

---

## ✅ عائق #2: Index.tsx يعرض Landing Page للمستخدم المسجّل أثناء التحميل — مُؤكَّد

**الملف**: `src/pages/Index.tsx` سطر 42-52
**الكود الفعلي**:
```text
useEffect(() => {
  if (!loading && user) {     ← ينتظر loading=false
    if (role === 'admin'...) navigate('/dashboard');
    ...
  }
}, [user, role, loading, navigate]);
```
**المشكلة المؤكدة**: لا يوجد أي `if (loading) return <Skeleton/>` — يعرض دائماً Landing Page كاملة (سطر 100-115) حتى أثناء التحميل.
**المشكلة الإضافية المؤكدة**: لا يوجد معالجة لحالة `loading=false && user && role=null` — المستخدم يبقى عالقاً.
**الإصلاح**: إضافة early return بـ skeleton للمستخدم المسجّل + fallback timeout.

---

## ✅ عائق #3: safety timeout 3 ثوانٍ + retry delay تصاعدي — مُؤكَّد

**الملف**: `src/contexts/AuthContext.tsx`
**الكود الفعلي**:
```text
سطر 126: setTimeout(() => { ... }, 3000);           ← 3 ثوانٍ
سطر 162: await new Promise(r => setTimeout(r, (attempt + 1) * 300));
         ← attempt=0: 300ms, attempt=1: 600ms
```
**أسوأ حالة مؤكدة**: 3 محاولات × (استعلام + تأخير) = قد يصل إلى 3 ثوانٍ + 900ms = ~4 ثوانٍ
**الإصلاح**: تقليل timeout إلى 2000ms + retry delay ثابت 200ms.

---

## ✅ عائق #4: ProtectedRoute يستخدم Loader2 spinner — مُؤكَّد

**الملف**: `src/components/ProtectedRoute.tsx`
**الكود الفعلي سطر 75-81**:
```text
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```
**مؤكَّد**: spinner بسيط بدلاً من PageLoader skeleton الموجود في App.tsx.
**auto-logout timeout مؤكَّد**: سطر 61 = `10000` (10 ثوانٍ).
**الإصلاح**: استبدال بـ PageLoader + تقليل timeout إلى 7 ثوانٍ.

---

## ملخص الإصلاحات المطلوبة (4 ملفات)

| # | الملف | التغيير | المخاطرة |
|---|-------|---------|----------|
| 1 | `src/main.tsx` | نقل `runPwaCacheGuard()` بعد `render()` | منخفضة — async بدون await أصلاً |
| 2 | `src/pages/Index.tsx` | skeleton للمسجّل أثناء التحميل + fallback 5s + معالجة role=null | منخفضة — لا تغيير في منطق المصادقة |
| 3 | `src/contexts/AuthContext.tsx` | timeout: 3000→2000ms, retry: تصاعدي→200ms ثابت | منخفضة — فقط أرقام زمنية |
| 4 | `src/components/ProtectedRoute.tsx` | PageLoader بدلاً من Loader2 + timeout: 10s→7s | منخفضة — فقط UI وأرقام |

**ملاحظة أمنية**: لا تعديل على منطق المصادقة أو التحقق من الأدوار أو RLS. التغييرات محصورة في أزمنة الانتظار والتجربة البصرية.

