

## موجة Auth Cleanup — استخراج `useAuthCleanup` (تحقيق جنائي)

### نتائج التحقيق

| فحص | نتيجة |
|-----|-------|
| مستهلكو `signOut` | `useLogoutFlow`, `useDashboardPrefetch`, `useDashboardSummary` (الأخير يستخدم `supabase.auth.signOut` مباشرة — خارج النطاق) + mock في `AdminDashboard.test.tsx` |
| توقيع `signOut` | `() => Promise<void>` — **سيبقى كما هو** ✅ |
| `CLEARABLE_STORAGE_KEYS` | يُستهلك حصراً في `AuthContext.tsx` ✅ |
| `clearSlowQueries` / `clearPageLoadEntries` | تُستهلك أيضاً في `PagePerformanceCard.tsx` (لا تأثير على الاستخراج) ✅ |
| نمط الاختبارات | co-located (`useWebAuthn.test.ts`) — لا يوجد `__tests__/` |
| `useAuthListener` | منفصل بالفعل — لا تداخل |

### التغييرات

**1) ملف جديد** `src/hooks/auth/useAuthCleanup.ts`
- يُصدّر `useAuthCleanup()` بـ `performCleanup` ثابت المرجع (`useCallback` بدون deps)
- يحوي: `queryClient.clear()` → مسح localStorage عبر `CLEARABLE_STORAGE_KEYS` → مسح sessionStorage (`FISCAL_YEAR`, `NID_LOCKED_UNTIL`) → dynamic import للـ monitoring مع silent catch → `toast.dismiss()`
- لا يلمس `setRole` (يبقى مسؤولية `AuthContext`)

**2) ملف اختبار جديد** `src/hooks/auth/useAuthCleanup.test.ts` (co-located — مطابق للنمط)
- mocks: `@/lib/queryClient`, `@/lib/storage`, `@/lib/monitoring`, `sonner`
- اختبارات:
  - يستدعي `queryClient.clear()` مرة واحدة
  - يستدعي `safeRemove` لكل مفتاح في `CLEARABLE_STORAGE_KEYS`
  - يستدعي `safeSessionRemove` للمفتاحين الحساسين
  - dynamic import الفاشل لا يُسبب رمي خطأ
  - `toast.dismiss()` يُنفَّذ

**3) تعديل** `src/contexts/AuthContext.tsx`
- إزالة الاستيرادات: `queryClient`, `toast`, `STORAGE_KEYS`, `CLEARABLE_STORAGE_KEYS`, `safeRemove`, `safeSessionRemove`
- إضافة استيراد: `useAuthCleanup`
- استدعاء `const { performCleanup } = useAuthCleanup()` داخل `AuthProvider`
- تبسيط `signOut` finally إلى: `setRole(null); performCleanup();`
- تحديث deps: `[setRole, performCleanup]`
- تحديث التعليق المرجعي رقم 14 (تعليق `// #15 perf`) → ينتقل إلى `useAuthCleanup.ts` بدلاً من `AuthContext`

### ضمانات السلامة

- ✅ توقيع `signOut` العام لم يتغيّر — `useLogoutFlow`, `useDashboardPrefetch`, mocks الاختبار تعمل بدون تعديل
- ✅ ترتيب التنفيذ محفوظ (queryClient → localStorage → sessionStorage → monitoring → toast)
- ✅ `setRole(null)` يبقى داخل `AuthContext` (state مرتبط بالـ context)
- ✅ القاعدة الذهبية: لا تعديل على `useAuthListener` ولا على ملفات الحماية الأخرى
- ✅ إعادة الاستخدام المستقبلية: hook متاح لـ session-expiry handlers بدون coupling مع AuthContext

### القياس
- AuthContext: ~106 → ~92 سطر (-14)
- منطق التنظيف معزول وقابل للاختبار منعزلاً (5 اختبارات وحدة)

