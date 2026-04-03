
## تحليل البنود العشرة

### ✅ منجز فعلاً (لا يحتاج تعديل):
1. **إزالة useEffect من التوجيه** — `RequirePermission` و `ProtectedRoute` يستخدمان `<Navigate />` التصريحي بالفعل. useEffect الموجود فقط للتسجيل (logging) وليس للتوجيه.
6. **توحيد ErrorBoundary** — لا يوجد إعادة تحميل تلقائي (auto-reload). المستخدم يضغط زراً يدوياً. بعد محاولتين يُعاد للصفحة الرئيسية. آمن من الحلقات.
7. **QueryClient staleTime** — مضبوط على 5 دقائق مع retry ذكي وrefetchOnWindowFocus: false.
10. **Session Refresh صامت** — Supabase يتولى ذلك تلقائياً عبر `onAuthStateChange` + `TOKEN_REFRESHED`.

### ❌ يتعارض مع قيود المشروع:
9. **Zustand/Redux** — قواعد المشروع تمنع ذلك صراحةً: "لا Redux/Zustand". سنستخدم بدائل React المدمجة.

### 🔧 قابل للتنفيذ (5 بنود):

**البند 2: React Router Loaders (createBrowserRouter)**
- ترحيل من `<BrowserRouter>` + `<Routes>` إلى `createBrowserRouter` + `createRoutesFromElements`
- نقل فحص الصلاحيات إلى `loader` functions تعمل قبل تحميل المكون
- يزيل وميض الواجهة (flickering) تماماً

**البند 3+4: حقن الدور في JWT Claims**
- إنشاء Custom Access Token Hook في قاعدة البيانات
- الدور يُقرأ من `session.access_token` مباشرة بدلاً من استعلام منفصل
- يلغي الحاجة لـ fetchUserRole() وتأخيراتها

**البند 5: إزالة المؤقتات من AuthContext**
- حذف signInTimeout (8 ثوانٍ) — لم يعد ضرورياً مع JWT Claims
- حذف retry loop (300ms × 3) — الدور يأتي مع التوكن

**البند 8: فصل Context الثقيل**
- فصل AuthContext إلى AuthStateContext (user/session/role) + AuthActionsContext (signIn/signOut)
- يمنع إعادة تصيير المكونات التي تقرأ الحالة فقط عند تغيير الدوال

**البند 9 (بديل):** استبدال localStorage بـ `useSyncExternalStore` مخصص بدلاً من Zustand
