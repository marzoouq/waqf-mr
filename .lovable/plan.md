

# خطة إصلاح المشاكل الحقيقية المتبقية

بعد فحص كل نقطة في التقرير مقابل الكود الفعلي، هذه هي المشاكل الحقيقية فقط:

---

## المشاكل المرفوضة (ليست مشاكل حقيقية)

| النقطة | السبب |
|--------|-------|
| CRITICAL-1 (حذف النفس) | **مُصلح في الواجهة** — السطر 378: `{!isSelf(user.id) && (` يخفي زر الحذف. والسطر 450: `disabled={isSelf(editingUser.id)}` يعطل تغيير الدور. لكن Edge Function تحتاج حماية إضافية على الخادم. |
| CRITICAL-3 (loading عالق) | **مُصلح** — `Auth.tsx` السطر 281-301 يعالج `user && !loading && !role` مع `roleWaitTimeout` بعد 5 ثوان. و`ProtectedRoute` السطر 56-58 يوجه لصفحة `/auth` عند `!role && !loading`. |
| MEDIUM-2 (refreshRole) | تصميم مقصود — `refreshRole` وظيفة خفيفة للتحديث اليدوي ولا تحتاج loading state |
| MEDIUM-3 (rate limiter) | مقبول لبيئة Edge Functions — الحماية الأساسية موجودة ومكملة بحماية الخادم |
| MEDIUM-5 (waqif share=0) | متوقع — الواقف ليس مستفيداً ولا يظهر في جدول المستفيدين |
| NEW-7 (role في deps) | **ليس خطأ** — `AuthContext` يستخدم `roleRef.current` (useRef) وليس `role` (state) داخل callback onAuthStateChange، وهذا هو الإصلاح المقصود لمشكلة stale closure |
| MINOR-4 (AppRole unused) | مستخدم في السطر 4 كـ type import — ليس خطأ |

---

## المشاكل الحقيقية (3 فقط)

### 1. CRITICAL-2 — تناقض صلاحيات `waqif` بين القائمة والمسارات (حرج)

**المشكلة:** `DashboardLayout.tsx` يُظهر رابطي "الإفصاح السنوي" و"حصتي من الريع" للواقف (disclosure: true في defaultRolePerms)، لكن `App.tsx` يمنع الواقف من الوصول لهذين المسارين (`allowedRoles={['admin', 'beneficiary']}`). النتيجة: الواقف يرى الرابط ← يضغطه ← يُوجَّه لصفحة "غير مصرح".

**الإصلاح:** إزالة `disclosure: true` من `waqif` في `DashboardLayout.tsx` وإزالة روابط "الإفصاح" و"حصتي" من القائمة عند غياب الصلاحية. يجب أيضاً إضافة `share: false` بشكل صريح.

### 2. CRITICAL-1 (جزئي) — Edge Function لا تمنع حذف النفس على الخادم

**المشكلة:** رغم إخفاء الزر في الواجهة، يمكن لشخص ما استدعاء Edge Function مباشرة لحذف حسابه أو تغيير دوره. الحماية يجب أن تكون على مستوى الخادم أيضاً.

**الإصلاح:** إضافة فحص `callerId === userId` في حالتي `delete_user` و `set_role` في `admin-manage-users/index.ts`.

### 3. MEDIUM-1 — تكرار تعريف `FiscalYear` (متوسط)

**المشكلة:** `src/types/database.ts` يعرّف `published?: boolean` (اختياري)، بينما `src/hooks/useFiscalYears.ts` يعرّف `published: boolean` (إجباري). هذا يسبب عدم اتساق في TypeScript.

**الإصلاح:** جعل `published` إجباري في `database.ts` ليتطابق مع قاعدة البيانات (العمود `NOT NULL DEFAULT false`).

---

## القسم التقني

### الملف 1: `src/components/DashboardLayout.tsx` (سطر 118-121)
```text
// قبل
waqif: {
  properties: true, contracts: true, disclosure: true,
  reports: true, accounts: true, bylaws: true,
},

// بعد
waqif: {
  properties: true, contracts: true, disclosure: false,
  reports: true, accounts: true, bylaws: true,
  share: false,
},
```

### الملف 2: `supabase/functions/admin-manage-users/index.ts`
في `delete_user` (سطر 169-170): إضافة فحص `callerId === userId` قبل الحذف.
في `set_role` (سطر 154-156): إضافة نفس الفحص قبل تغيير الدور.

```text
case "delete_user": {
  validateUuid(userId);
  if (userId === callerId) {
    return new Response(JSON.stringify({ error: "لا يمكنك حذف حسابك الخاص" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // ... باقي الكود
}

case "set_role": {
  validateUuid(userId);
  validateRole(body.role);
  if (userId === callerId) {
    return new Response(JSON.stringify({ error: "لا يمكنك تغيير دورك بنفسك" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // ... باقي الكود
}
```

### الملف 3: `src/types/database.ts` (سطر 164)
```text
// قبل
published?: boolean;

// بعد
published: boolean;
```

