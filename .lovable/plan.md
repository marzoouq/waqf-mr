

# خطة: إصلاح تسجيل الخروج + عنوان الهيدر الديناميكي

## مشكلة تسجيل الخروج — التحليل

`handleSignOut` يستدعي `signOut()` فقط (سطر 282-284) بدون أي تنقل صريح. المفترض أن `ProtectedRoute` يعيد التوجيه عندما يصبح `user = null`، لكن:
- على الجوال: `AlertDialog` داخل Sidebar (`z-[60]`) قد يبقى مفتوحاً ويمنع إعادة التوجيه
- `handleIdleLogout` يستخدم `window.location.href = '/auth?reason=idle'` — أي أنه يعمل لأنه يتنقل صراحة
- `handleSignOut` لا يفعل ذلك — يعتمد فقط على React state change

## التغييرات المطلوبة

### 1. `src/components/DashboardLayout.tsx`

**إصلاح تسجيل الخروج** — إضافة `useNavigate` وتنقل صريح بعد `signOut()`:
```tsx
const handleSignOut = async () => {
  setMobileSidebarOpen(false); // أغلق القائمة الجانبية أولاً
  await signOut();
  navigate('/auth', { replace: true });
};
```

**عنوان الهيدر الديناميكي** — إضافة خريطة عناوين واستبدال النص الثابت:
```tsx
// خريطة مسارات → عناوين (مستوى الوحدة)
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'الرئيسية',
  '/dashboard/properties': 'العقارات',
  '/dashboard/contracts': 'العقود',
  '/dashboard/income': 'الدخل',
  '/dashboard/expenses': 'المصروفات',
  '/dashboard/beneficiaries': 'المستفيدين',
  '/dashboard/reports': 'التقارير',
  '/dashboard/accounts': 'الحسابات',
  '/dashboard/users': 'إدارة المستخدمين',
  '/dashboard/settings': 'الإعدادات',
  '/dashboard/messages': 'المراسلات',
  '/dashboard/invoices': 'الفواتير',
  '/dashboard/audit-log': 'سجل المراجعة',
  '/dashboard/bylaws': 'اللائحة التنظيمية',
  '/beneficiary': 'الرئيسية',
  '/beneficiary/my-share': 'حصتي من الريع',
  // ... باقي المسارات
};
```

ثم في الهيدر الجوال (سطر 313):
```tsx
<span className="...">
  {ROUTE_TITLES[location.pathname] || 'إدارة الوقف'}
</span>
```

### 2. `src/contexts/AuthContext.tsx`

لا تغيير — `signOut` يبقى كما هو (مسؤولية التنقل على المكون المستدعي).

### ملف واحد يتغير: `DashboardLayout.tsx`
- إضافة `useNavigate` في الاستيراد
- إضافة `ROUTE_TITLES` ثابت خارج الـ component
- تعديل `handleSignOut` ليغلق القائمة ثم ينتقل
- استبدال النص الثابت في الهيدر بعنوان ديناميكي

