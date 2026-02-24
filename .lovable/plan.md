

# خطة إصلاح المشاكل الجنائية المؤكدة (11 مشكلة)

بعد الفحص المباشر للكود، تأكد أن **BUG-1 مُصلَح بالفعل** (السطر 115 يشمل `waqif`). المشاكل الـ 11 المتبقية مؤكدة وتحتاج إصلاح.

---

## المرحلة 1: المشاكل الحرجة (تكسر التطبيق)

### BUG-2 — Realtime channel تسرّب في BeneficiaryDashboard
**الملف:** `src/pages/beneficiary/BeneficiaryDashboard.tsx` (سطر 75-90)

**المشكلة:** اسم channel ثابت + ترتيب cleanup خاطئ.

**الإصلاح:**
- تغيير اسم الـ channel ليشمل `beneficiary.id`:
  ```
  .channel(`beneficiary-distributions-${currentBeneficiary.id}`)
  ```
- إزالة `channel.unsubscribe()` والاكتفاء بـ `supabase.removeChannel(channel)` الذي يقوم بالعمليتين.

---

### BUG-3 — deleteUser لا يُغلق الـ Dialog
**الملف:** `src/pages/dashboard/UserManagementPage.tsx` (سطر 139-142)

**الإصلاح:** إضافة `setDeleteUserId(null)` في `onSuccess`.

---

### BUG-4 — isPending مشترك يُعطّل كل الأزرار
**الملف:** `src/pages/dashboard/UserManagementPage.tsx` (سطر 325-334)

**الإصلاح:** تتبع الـ `userId` قيد التنفيذ عبر state منفصل:
```tsx
const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
```
واستخدام `disabled={pendingConfirmId === user.id}` بدلاً من `confirmEmail.isPending`.

---

## المرحلة 2: المشاكل الأمنية العالية

### BUG-5 — الناظر يحذف نفسه
**الملف:** `src/pages/dashboard/UserManagementPage.tsx` (سطر 358-365)

**الإصلاح:** إخفاء زر الحذف عندما يكون `user.id === currentUser?.id`:
```tsx
{user.id !== currentUser?.id && (
  <Button onClick={() => setDeleteUserId(user.id)}>...</Button>
)}
```

### BUG-6 — الناظر يخفّض دور نفسه
**الملف:** `src/pages/dashboard/UserManagementPage.tsx` (سطر 415-423)

**الإصلاح:** تعطيل زر "تحديث الدور" إذا كان `editingUser.id === currentUser?.id`:
```tsx
disabled={setRole.isPending || editingUser?.id === user?.id}
```
مع إظهار تحذير نصي.

### BUG-7 — guard-signup يمنح beneficiary فوراً
**الملف:** `supabase/functions/guard-signup/index.ts` (سطر 101-110)

**التحليل:** هذا **تصميم مقصود** وليس خطأ — بدون دور، المستخدم لن يستطيع الوصول لأي شيء (RLS تمنعه). الدور `beneficiary` مع عدم تأكيد البريد يعني عملياً لا وصول. لكن للأمان الإضافي:
- إضافة حقل `pending_approval` في جدول `user_roles` أو الاكتفاء بأن تأكيد البريد يدوي من الناظر يكفي كبوابة.
- **القرار:** الإبقاء على السلوك الحالي مع توضيح في التعليقات أن البريد غير المؤكد يمنع الدخول فعلياً.

---

## المرحلة 3: المشاكل المنطقية المتوسطة

### BUG-8 — waqif يرى "مستفيد" كاسم
**الملف:** `src/pages/beneficiary/BeneficiaryDashboard.tsx` (سطر 159)

**الإصلاح:** التحقق من الدور وعرض النص المناسب:
```tsx
{currentBeneficiary?.name || (role === 'waqif' ? 'الواقف' : role === 'admin' ? 'الناظر' : 'مستفيد')}
```

### BUG-9 — FiscalYear.status لا يشمل published
**الملف:** `src/types/database.ts` (سطر 163)

**الإصلاح:**
```typescript
status: 'active' | 'closed';
```
**ملاحظة:** بعد فحص قاعدة البيانات، العمود `published` هو حقل `boolean` منفصل وليس قيمة في `status`. لذا النوع الحالي **صحيح**. لكن يجب إضافة حقل `published` للـ interface:
```typescript
published?: boolean;
```

### BUG-10 — Notification.type ليس union type
**الملف:** `src/types/database.ts` (سطر 152)

**الإصلاح:**
```typescript
type: 'info' | 'success' | 'warning' | 'error';
```

### BUG-11 — registrationEnabled قراءة/كتابة غير متزامنة
**الملف:** `src/pages/dashboard/UserManagementPage.tsx` (سطر 52-73)

**الإصلاح:** إعادة fetch بعد التغيير بدلاً من تحديث state يدوياً. استخدام `useQuery` + `invalidateQueries` بدلاً من `useEffect` + `setState`.

### BUG-12 — لا يوجد refreshRole في AuthContext
**الملف:** `src/contexts/AuthContext.tsx`

**الإصلاح:** إضافة دالة `refreshRole` للـ context:
```typescript
const refreshRole = async () => {
  if (!user) return;
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (data) setRole(data.role as AppRole);
};
```

---

## ملخص التغييرات حسب الملف

| الملف | التغييرات |
|-------|-----------|
| `BeneficiaryDashboard.tsx` | BUG-2 (channel name + cleanup), BUG-8 (waqif name) |
| `UserManagementPage.tsx` | BUG-3 (close dialog), BUG-4 (per-button pending), BUG-5 (self-delete), BUG-6 (self-demote), BUG-11 (registration sync) |
| `database.ts` | BUG-9 (published field), BUG-10 (notification type) |
| `AuthContext.tsx` | BUG-12 (refreshRole) |
| `guard-signup/index.ts` | BUG-7 (توضيح التعليقات فقط) |

## القسم التقني

- جميع التغييرات متوافقة مع البنية الحالية ولا تتطلب تعديلات على قاعدة البيانات
- BUG-4 يتطلب state إضافي لتتبع العملية الجارية لكل مستخدم
- BUG-11 يتطلب تحويل من `useEffect` إلى `useQuery` مما يبسط الكود
- BUG-12 يتطلب تعديل الـ interface و الـ Provider معاً
- بعد الإصلاح، يجب تشغيل الاختبارات الكاملة للتأكد من عدم وجود تراجعات

