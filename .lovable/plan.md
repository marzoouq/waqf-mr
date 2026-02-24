

# خطة إصلاح المشاكل المكتشفة في الفحص الجنائي النهائي

بعد التحقق من الكود الحالي، تم تأكيد 7 مشاكل حقيقية تحتاج إصلاح.

---

## المشاكل المؤكدة والإصلاحات المطلوبة

### 1. (حرج) `quickLinks` في `BeneficiaryDashboard` تظهر صفحات محظورة لـ `waqif`

السطر 96-101 يعرض قائمة ثابتة تشمل "الإفصاح السنوي" و"حصتي من الريع" لكل الأدوار. الواقف عند الضغط عليهما يُوجَّه لصفحة "غير مصرح".

**الإصلاح:** فلترة `quickLinks` بناء على `role` من `useAuth()` — إخفاء "الإفصاح السنوي" و"حصتي من الريع" عندما يكون الدور `waqif`.

### 2. (حرج) `nationalId@waqf.app` يُسجَّل كبريد في `access_log` (تسريب PII)

السطر 143-146 في `Auth.tsx` يسجل البريد المبني من رقم الهوية `1234567890@waqf.app` في سجل الوصول، مما يكشف رقم الهوية الوطنية.

**الإصلاح:** عند `login_method === 'national_id'`، إرسال `null` كبريد وتسجيل طريقة الدخول فقط في `metadata`.

### 3. (متوسط) `useIdleTimeout` يُطلق `onIdle` مرتين

السطران 47-56: الـ countdown interval والـ main timer يمكن أن يُطلقا `onIdle` في نفس اللحظة.

**الإصلاح:** إضافة `firedRef = useRef(false)` كحارس يمنع الاستدعاء المزدوج، مع إعادة ضبطه في `resetTimer`.

### 4. (متوسط) `defaultRolePerms` يُبطل `useMemo` في كل render

الكائن يُنشأ داخل جسم المكون (سطر 108) فيحصل على مرجع جديد كل مرة.

**الإصلاح:** نقل `defaultRolePerms` خارج المكون كثابت على مستوى الملف (module-level constant).

### 5. (متوسط) `refreshRole` لا تعالج الخطأ ولا حالة `null`

السطر 200-208 في `AuthContext.tsx`: لا يوجد try/catch، وإذا أرجعت الاستعلام `null` يبقى الدور القديم.

**الإصلاح:** إضافة try/catch، وعند `data === null` تعيين `role = null` لأن المستخدم فقد دوره فعلا.

### 6. (طفيف) `guard-signup` يُرجع كائن `user` كاملا في الاستجابة

السطر 116-118: يكشف `user.id`, `user.email`, `user.app_metadata` للمتصفح.

**الإصلاح:** إرجاع `{ success: true, message: "..." }` فقط.

### 7. (طفيف) `settingsLoading` غير مستخدم في `DashboardLayout`

السطر 103: متغير مُستورد بلا استخدام.

**الإصلاح:** إزالة الاستيراد.

---

## المشاكل المرفوضة

| النقطة | السبب |
|--------|-------|
| NEW-CRITICAL-1 (Double Logout) | تأثير عملي معدوم — `setRoleWithRef(null)` مرتين لا يضر، و`window.location.href` يُلغي كل شيء |
| NEW-MEDIUM-2 (authReady) | التقرير نفسه اعترف بعدم وجود مشكلة وظيفية |
| NEW-MEDIUM-4 (list_users 500) | نظام وقف بـ 14 مستفيد — لن يصل لـ 500 مستخدم. تحسين مؤجل |
| NEW-MINOR-2 (AppRole unused) | `type import` لا يؤثر على الحزمة ولا يُنتج كود |

---

## القسم التقني — تفاصيل التعديلات

### الملف 1: `src/pages/beneficiary/BeneficiaryDashboard.tsx`
- استيراد `useAuth` من `AuthContext`
- فلترة `quickLinks` لإخفاء disclosure و my-share عن waqif:
```text
const { role } = useAuth();
const quickLinks = [
  ...(role !== 'waqif' ? [
    { title: 'الإفصاح السنوي', ..., path: '/beneficiary/disclosure', ... },
    { title: 'حصتي من الريع', ..., path: '/beneficiary/my-share', ... },
  ] : []),
  { title: 'التقارير المالية', ... },
  { title: 'اللائحة التنظيمية', ... },
];
```

### الملف 2: `src/pages/Auth.tsx` (سطر 143-146)
```text
// قبل
email: resolvedEmail,

// بعد
email: loginMethod === 'national_id' ? null : resolvedEmail,
```

### الملف 3: `src/hooks/useIdleTimeout.ts`
- إضافة `const firedRef = useRef(false);`
- في `resetTimer`: إضافة `firedRef.current = false;`
- في كلا الموقعين اللذين يستدعيان `onIdleRef.current()`: لف الاستدعاء بـ `if (!firedRef.current)`

### الملف 4: `src/components/DashboardLayout.tsx`
- نقل كائن `defaultRolePerms` من داخل المكون (سطر 108-123) إلى خارجه كثابت module-level

### الملف 5: `src/contexts/AuthContext.tsx` (سطر 200-208)
```text
const refreshRole = async () => {
  if (!user) return;
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    setRoleWithRef(data ? (data.role as AppRole) : null);
  } catch {
    // صامت — لا نكسر تجربة المستخدم
  }
};
```

### الملف 6: `supabase/functions/guard-signup/index.ts` (سطر 116-122)
```text
// قبل
return new Response(JSON.stringify({ user: userData.user, message: "..." }), ...);

// بعد
return new Response(JSON.stringify({ success: true, message: "..." }), ...);
```

### الملف 7: `src/components/DashboardLayout.tsx` (سطر 103)
```text
// قبل
const { getJsonSetting, isLoading: settingsLoading } = useAppSettings();

// بعد
const { getJsonSetting } = useAppSettings();
```

