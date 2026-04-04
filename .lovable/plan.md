

# التشخيص الجنائي المؤكد والخطة النهائية

## السبب الجذري المؤكد بالدليل

فحصت **كلتا البيئتين** (إنتاج + تطوير) وهذه النتيجة:

```text
بيئة الإنتاج:
  alkayala3@gmail.com → jwt_role = NULL ❌ | db_role = admin ✅
  alkayala1@gmail.com → jwt_role = NULL ❌ | db_role = accountant ✅
  جميع المستفيدين    → jwt_role = NULL ❌ | db_role = beneficiary ✅

بيئة التطوير:
  alkayala3@gmail.com → jwt_role = NULL ❌ | db_role = admin ✅
  (نفس المشكلة بالضبط!)
```

**كلتا البيئتين متطابقتان في المشكلة**: المشغل `trg_sync_role_to_auth_meta` موجود ويعمل، لكنه يعمل فقط عند INSERT/UPDATE على `user_roles`. جميع المستخدمين الحاليين أُنشئوا **قبل** إضافة المشغل، لذا `app_metadata.user_role` فارغ لكل المستخدمين.

## لماذا ينكسر كل شيء

```text
1. jwt_role() يقرأ حصراً من app_metadata → يُرجع NULL
2. كل سياسات RLS تعتمد على jwt_role() → ترفض الوصول
3. الدخول ينجح (signIn OK) → AuthContext يجد الدور من DB fallback
4. التوجيه إلى /dashboard ينجح
5. استعلامات البيانات تفشل (RLS ترفض) → [App Error]
6. React Query يعيد المحاولة → قفل Token → تصلب الشاشة
```

## لماذا نجح الاختبار سابقاً في المتصفح؟

لأن المتصفح أعاد تحميل الصفحة عدة مرات أثناء الاختبار، والـ DB fallback في AuthContext أعطى الدور للواجهة. لكن **استعلامات البيانات الفعلية** (عقارات، عقود، مستفيدين) تفشل بصمت لأن `jwt_role()` في RLS يُرجع NULL.

## الخطة (3 تغييرات فقط)

### 1. هجرة SQL: تعبئة `user_role` لجميع المستخدمين الحاليين
```sql
UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) 
  || jsonb_build_object('user_role', ur.role::text)
FROM public.user_roles ur
WHERE u.id = ur.user_id
  AND (u.raw_app_meta_data->>'user_role' IS NULL 
       OR u.raw_app_meta_data->>'user_role' != ur.role::text);
```
هذا يحل المشكلة الجذرية: كل المستخدمين سيحصلون على `user_role` في `app_metadata` → `jwt_role()` سيعمل → RLS ستمرر البيانات.

### 2. `src/contexts/AuthContext.tsx` — إصلاح `signIn`
إضافة `refreshSession()` بعد الدخول إذا التوكن لا يحتوي الدور:
```typescript
const signIn = useCallback(async (email: string, password: string) => {
  setLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { setLoading(false); return { error }; }
  
  // إجبار جلب توكن جديد يحتوي الدور بعد تعبئة app_metadata
  const jwtRole = getRoleFromSession(data?.session);
  if (!jwtRole) {
    await supabase.auth.refreshSession();
  }
  return { error: null };
}, []);
```
هذا يضمن أن التوكن الأول بعد الهجرة يحمل الدور، ويحل race condition.

### 3. `src/hooks/page/useAuthPage.ts` — تحصين التوجيه
```typescript
useEffect(() => {
  if (loading) return; // انتظار اكتمال التحميل
  if (user && role) {
    // ... نفس منطق التوجيه الحالي
  }
}, [user, role, loading, navigate]);
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| هجرة SQL جديدة | تعبئة `user_role` في `app_metadata` لكل المستخدمين |
| `src/contexts/AuthContext.tsx` | تعديل `signIn` — إضافة `refreshSession()` (3 أسطر) |
| `src/hooks/page/useAuthPage.ts` | إضافة `if (loading) return;` (سطر واحد) |

## ما لن أغيّره
- لن أعدل `lazyWithRetry.ts` — المشكلة ليست فيه بل في فشل RLS
- لن أعدل `useFiscalYears.ts` — `enabled: true` صحيح لأن RLS يتكفل بالتصفية (بعد إصلاح jwt_role)
- لن أعدل `usePublicStats.ts` — الأصفار ستختفي عندما يعمل `jwt_role()` (الدالة `get_public_stats` تعتمد على RLS أيضاً)

## التحقق بعد التنفيذ
بعد النشر، يجب التحقق من أن `jwt_role` أصبح موجوداً لكل المستخدمين وأن الدخول يعمل بسلاسة.

