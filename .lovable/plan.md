

# خطة: إصلاح شامل لمنظومة تسجيل الخروج

## المشاكل الحقيقية والإصلاحات

### 1. `src/App.tsx` — تصدير `queryClient` ليكون قابلاً للاستيراد
- السطر 87: تحويل `const queryClient` إلى `export const queryClient` ليُستورد في AuthContext

### 2. `src/contexts/AuthContext.tsx` — إصلاح `signOut()` بالكامل
- استيراد `queryClient` من `@/App`
- إضافة `try/catch/finally` حول `supabase.auth.signOut()`
- إضافة `queryClient.clear()` لتنظيف cache البيانات
- إضافة `localStorage.removeItem('waqf_selected_fiscal_year')` و `localStorage.removeItem('sidebar-open')`
- الحالة المحلية (`setRoleWithRef(null)`) تتم في `finally` لضمان التنفيذ حتى لو فشلت الشبكة

### 3. `src/components/DashboardLayout.tsx` — توحيد آلية الخروج
- `handleSignOut` (اليدوي): استبدال `navigate('/auth')` بـ `window.location.href = '/auth'` لضمان hard reload وتنظيف كامل — متسق مع الخروج التلقائي
- أو بديل: إبقاء `navigate` لأن `queryClient.clear()` أصبح يُنفذ في `signOut()` الآن — كلا الخيارين آمن بعد الإصلاح #2

### 4. `src/pages/Auth.tsx` — إضافة توجيه بعد الخروج من صفحة انتظار الدور
- السطر 386: تغيير `onClick` ليضيف `window.location.reload()` بعد `signOut()` لإعادة رسم الصفحة بحالة `user=null`

### 5. `src/components/Sidebar.tsx` — لا تغيير مطلوب
- `AlertDialogAction` يُغلق الـ dialog تلقائياً بعد الضغط — الضغط المزدوج غير ممكن عملياً لأن الـ dialog يختفي فوراً

## الملفات المتأثرة: 3 ملفات
- `src/App.tsx` — إضافة `export` لـ queryClient
- `src/contexts/AuthContext.tsx` — إصلاح signOut الشامل
- `src/pages/Auth.tsx` — إضافة reload بعد signOut في زر انتظار الدور

