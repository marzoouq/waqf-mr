

## خطة إصلاح المشكلات المكتشفة

### ملاحظة حول مشكلة `.env`
ملف `.env` يُدار تلقائياً بواسطة Lovable Cloud ولا يمكن حذفه أو تعديله من هنا. المفتاح الموجود فيه هو `anon key` (مفتاح عام) وليس سرياً — هو مصمم ليكون مكشوفاً في الـ frontend. الحماية الفعلية تتم عبر RLS policies. أما على GitHub، يمكنك حذفه يدوياً من السجل باستخدام `git rm --cached .env`.

### ملاحظة حول `bun.lock`
يجب حذفه يدوياً من GitHub وإضافة `bun.lock` إلى `.gitignore` (حالياً فقط `bun.lockb` مُستثنى).

---

### الإصلاحات التي سننفذها (5 تغييرات):

#### 1. إصلاح `signIn` — إضافة safety net لـ `setLoading(false)`
**الملف:** `src/contexts/AuthContext.tsx`
- إضافة `finally` block أو timeout احتياطي ل

<lov-plan>

## خطة إصلاح المشكلات المكتشفة

### ملاحظات أولية

**`.env` على GitHub:** المفتاح الموجود هو `anon key` (مفتاح عام مصمم للـ frontend) — الحماية عبر RLS. لكن يُفضل حذفه من تاريخ Git يدوياً عبر `git rm --cached .env`.

**`bun.lock`:** يجب حذفه يدوياً من GitHub. سنضيف `bun.lock` إلى `.gitignore`.

---

### الإصلاحات (5 تغييرات):

#### 1. `signIn` — safety timeout لـ `loading`
**الملف:** `src/contexts/AuthContext.tsx`

إضافة timeout احتياطي 8 ثوانٍ بعد النجاح، في حال تأخر `onAuthStateChange`:
```typescript
const signIn = async (email: string, password: string) => {
  setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setLoading(false);
  } else {
    // safety: إذا لم يصل onAuthStateChange خلال 8 ثوانٍ
    setTimeout(() => setLoading(false), 8000);
  }
  return { error };
};
```

#### 2. `refreshRole` — إضافة حالة تحميل مؤقتة
**الملف:** `src/contexts/AuthContext.tsx`

لن نستخدم `setLoading(true)` لأنه سيخفي الصفحة بالكامل. بدلاً من ذلك، السلوك الحالي مقبول — الدور يتحدث بصمت مع إظهار toast عند الخطأ. لا تغيير مطلوب.

#### 3. تنظيف `console.log/error` في Edge Functions
**الملفات:**
- `supabase/functions/admin-manage-users/index.ts` — استبدال ~7 `console.log/error` برسائل عامة بدون تفاصيل داخلية (مثل إزالة `JSON.stringify(updError)` و `verifyBody`)
- `supabase/functions/auth-email-hook/index.ts` — تنظيف ~12 `console.log/error` لإزالة أي تفاصيل حساسة مع الإبقاء على رسائل التشخيص العامة

#### 4. إضافة `bun.lock` إلى `.gitignore`
**الملف:** `.gitignore`

إضافة `bun.lock` بجانب `bun.lockb` الموجودة.

#### 5. دمج `useMemo` في `ExpenseBudgetBar.tsx`
**الملف:** `src/components/expenses/ExpenseBudgetBar.tsx`

دمج `spentByType` + `allTypes` + `budgetMap` في `useMemo` واحد يعيد object واحد.

#### 6. إزالة `React` غير المستخدم
**الملف:** `src/contexts/AuthContext.tsx`

تغيير `import React, { useEffect, ... }` إلى `import { useEffect, ... }` فقط، مع استخدام `React.ReactNode` من import منفصل عبر `import type`.

---

### خارج النطاق (يدوي)
- حذف `.env` من تاريخ Git: `git rm --cached .env && git commit`
- حذف `bun.lock` من GitHub: `git rm --cached bun.lock && git commit`
- ملفات barrel hooks: تحسين تدريجي مستقبلي

