

# تحليل: عدم ظهور بيانات صفحة إدارة المستخدمين

## المشكلة المحددة

استعلام `useQuery` في `UserManagementPage.tsx` (سطر 92) **لا يحتوي على شرط `enabled`** لانتظار جاهزية المصادقة. هذا يعني:

1. الاستعلام يُنفذ فوراً عند تحميل الصفحة
2. إذا لم تكن الجلسة جاهزة بعد، `getUser()` أو `getSession()` تفشل
3. React Query يعتبرها خطأ ويعرض البيانات الافتراضية (مصفوفة فارغة)
4. **لا يوجد عرض لرسالة الخطأ** — الكود لا يستخدم `isError` أو يعرض أي تنبيه عند فشل جلب البيانات

## خطة الإصلاح

### 1. إضافة `enabled` guard للاستعلامات
**الملف**: `src/pages/dashboard/UserManagementPage.tsx`

- إضافة `enabled: !!currentUser` لاستعلام `admin-users` (سطر 92)
- إضافة نفس الحارس لاستعلامات `orphaned-beneficiaries` و `unlinked-beneficiaries`

```typescript
const { data: usersResult, isLoading, isError, error } = useQuery({
  queryKey: ['admin-users', currentPage],
  queryFn: async () => { ... },
  enabled: !!currentUser,  // ← لا تُنفذ حتى تتأكد من وجود مستخدم
});
```

### 2. عرض رسالة خطأ واضحة عند الفشل
إضافة معالجة `isError` لعرض تنبيه واضح للناظر بدلاً من صفحة فارغة بدون تفسير.

### 3. إضافة `retry` معقول
إضافة `retry: 2` للسماح بمحاولتين إضافيتين في حالة فشل مؤقت في الشبكة.

---

## التفاصيل التقنية

| الملف | التعديل |
|-------|---------|
| `UserManagementPage.tsx` سطر 92 | إضافة `enabled: !!currentUser` + `retry: 2` |
| `UserManagementPage.tsx` سطر 126 | إضافة `enabled: !!currentUser` لـ orphaned-beneficiaries |
| `UserManagementPage.tsx` سطر 138 | إضافة `enabled: !!currentUser` لـ unlinked-beneficiaries |
| `UserManagementPage.tsx` سطر ~450 | إضافة كتلة `isError` لعرض رسالة خطأ |

