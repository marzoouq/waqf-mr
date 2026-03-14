
# إصلاح مشاكل `UserManagementPage.tsx`

## تحقق من البنود

| # | البند | الحكم | التفاصيل |
|---|-------|-------|---------|
| CRIT-1 | `minLength=6` vs `disabled={length<8}` | **حقيقي** | سطر 657 و 663 — تناقض واضح |
| CRIT-2 | nationalId بدون validation | **حقيقي** | سطر 283-290 — `required` فقط |
| HIGH-1 | createForm لا يُصفَّر | **إنذار كاذب** | سطر 115 يُصفِّره: `setCreateForm({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' })` |
| HIGH-2 | رسالة حذف بدون بريد | **حقيقي** | سطر 676-678 |
| HIGH-3 | pagination لا تعود لـ 1 | **حقيقي** | بعد إنشاء/حذف |
| HIGH-4 | toggleRegistration بدون loading | **حقيقي** | سطر 71-79 + 217-220 |
| HIGH-5 | updateEmail بدون فحص تغيير | **حقيقي** | سطر 603 |
| MED-1 | إنشاء admin بدون تحذير | **ملاحظة UX** — ليس ثغرة |
| MED-2 | timezone غير صريح | **ملاحظة UX** — تحسين بسيط |
| MED-3 | لا بحث/فلتر | **ميزة جديدة** — خارج نطاق التدقيق |
| MED-4 | pendingConfirmId في mutationFn | **ملاحظة** — يعمل لأن onError يُصفِّره |
| MED-5 | password في state | **إنذار كاذب** — سطر 115 يُصفِّره |

## الإصلاحات المطلوبة (6 تعديلات في ملف واحد)

### 1. CRIT-1 — توحيد minLength
- سطر 278 + 657: تغيير `minLength={6}` → `minLength={8}`
- سطر 278 (create form): إضافة `minLength={8}`

### 2. CRIT-2 — validation لرقم الهوية
- إضافة `pattern="[0-9]{10}"` و `maxLength={10}` و `inputMode="numeric"` لحقل الهوية
- إضافة فحص في `onSubmit` قبل `createUser.mutate`

### 3. HIGH-2 — عرض بريد المستخدم في رسالة الحذف
- تغيير `deleteUserId` من `string | null` إلى `{ id: string; email: string } | null`
- تحديث رسالة التأكيد لعرض البريد

### 4. HIGH-3 — إعادة pagination لـ 1
- إضافة `setCurrentPage(1)` في `onSuccess` لـ `createUser` و `deleteUser`

### 5. HIGH-4 — loading state لـ toggleRegistration
- إضافة `useState<boolean>` للـ toggling state
- تعطيل Switch أثناء التنفيذ

### 6. HIGH-5 — فحص تغيير البريد
- إضافة `disabled` عندما `editEmail === editingUser?.email`

### 7. MED-2 — timezone صريح
- إضافة `{ timeZone: 'Asia/Riyadh' }` لجميع استدعاءات `toLocaleDateString`
