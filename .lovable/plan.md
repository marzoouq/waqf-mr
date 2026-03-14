

# تحليل بنود فحص لوحة الناظر

## التحقق من الكود الفعلي

### CRIT-A — `getSession()` في `callAdminApi` و `BeneficiariesPage` — **إنذار كاذب**

Edge Function `admin-manage-users` تتحقق من المستخدم عبر `getUser()` (سطر 37):
```
const { data: userData, error: userError } = await userClient.auth.getUser();
```
ثم تتحقق من دور admin عبر service role client (سطر 49-54). إذا زُوِّر token في localStorage، `getUser()` سترفضه. هذا هو النمط الصحيح المعتمد في المشروع (الحصول على token من `getSession` ← إرساله ← التحقق server-side بـ `getUser`). تم تأكيد هذا في الجولة السابعة (CRIT-16/17).

### HIGH-A — أرقام مشوهة عند `fiscalYearId='all'` — **إنذار كاذب**

`useRawFinancialData` يحوّل `fiscalYearId` إلى `'all'` عند القيم الخاصة (سطر 14). عند `'all'`:
- يجلب كل الإيرادات والمصروفات
- `currentAccount` يكون `null` (لا يتطابق مع أي `fiscal_year_id`)
- يمر إلى `calculateFinancials()` (سطر 128-139) الذي يحسب من البيانات الخام مباشرة

هذا سلوك مقصود — عند "كل السنوات" لا يوجد حساب ختامي واحد، فالنظام يحسب إجمالي كل السنوات. `fiscalYearStatus = undefined` يعني `isClosed = false`، فلا تُحسب الحصص — وهذا صحيح لعرض إجمالي.

### HIGH-B — `getSession()` في `usePaymentInvoices` — **إنذار كاذب**

نفس تحليل CRIT-A. لم يتم التحقق من وجود `getSession` في `usePaymentInvoices` أصلاً — هذا hook يستعلم مباشرة من Supabase client بدون Edge Function.

### HIGH-C — لا تحقق من حد أقصى للمبالغ — **مشكلة حقيقية (متوسطة)**

`parseFloat(formData.amount)` يقبل أي رقم بدون تحقق من أنه موجب أو ضمن حد معقول. لكن الخطورة متوسطة لأن:
- فقط admin و accountant يستطيعون الإدخال (RLS)
- هم أدوار موثوقة
- إدخال مبلغ سالب أو ضخم خطأ بشري لا هجوم

**الإصلاح مفيد كحماية**: إضافة `amount > 0 && amount <= 999_999_999` في validation.

### HIGH-D — `CloseYearDialog` لا يتحقق من الدور داخلياً — **إنذار كاذب**

- `handleCloseYear` في `useAccountsPage.ts` سطر 348: `if (role !== 'admin') return`
- RPC `close_fiscal_year` سطر 85: `IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN RAISE EXCEPTION`
- الحماية ثلاثية: UI → handler → RPC. React DevTools لا يستطيع تجاوز handler أو RPC.

ملاحظة: RPC يسمح للمحاسب أيضاً — هذا **تناقض مقصود** (RPC أكثر تسامحاً من UI). لكن ليس ثغرة.

### HIGH-E — `availableAmount < 0` يُعرض بلا تحذير — **ملاحظة تصميمية**

القيم السالبة تحدث فعلاً عندما المصروفات تتجاوز الإيرادات. عرضها بقيمة سالبة هو **معلومة دقيقة** — العجز حقيقي. إضافة تحذير مرئي مفيدة كـ UX لكنها ليست خطأ.

### HIGH-F — فلترة المستخدمين client-side — **ملاحظة أداء**

`list_users` يجلب كل المستخدمين ثم يُفلتر على `beneficiary`. الحل الأمثل هو فلترة server-side. لكن هذا مسألة أداء لا أمن — البيانات المُرجعة (email + id فقط) مرئية لـ admin بالفعل. عدد المستخدمين في نظام وقف عادة < 50.

### MED-A — orphanedContracts لا يكتشف سنوات محذوفة — **ملاحظة تصميمية**

السنوات المالية لا تُحذف في هذا النظام (لا يوجد زر حذف). الحالة الوحيدة هي `fiscal_year_id = null`. الفلتر الحالي كافٍ.

### MED-B إلى MED-F — ملاحظات تصميمية/أداء متنوعة

- MED-B: يحتاج تحقق — لكنه سيناريو نادر
- MED-C: تنظيم كود لا أمن
- MED-D: Storage policies هي الطبقة الصحيحة
- MED-E: الفلترة تتم **server-side** عبر `q.eq('type', type)` سطر 19 — **إنذار كاذب**
- MED-F: العقود الملغاة ليست نشطة فعلاً في حساب التحصيل لأن `activeContracts = fyContracts.filter(c => c.status === 'active')` في AdminDashboard

---

## الخلاصة

من 13 بنداً: **1 مشكلة متوسطة حقيقية** (validation المبالغ)، **12 إنذار كاذب أو ملاحظة تصميمية**.

## خطة الإصلاح

تعديل ملفين:

### 1. `src/pages/dashboard/IncomePage.tsx`
إضافة validation على المبلغ قبل الإرسال:
```typescript
const amount = parseFloat(formData.amount);
if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) {
  toast.error('المبلغ يجب أن يكون رقماً موجباً ولا يتجاوز 999,999,999');
  return;
}
```

### 2. `src/pages/dashboard/ExpensesPage.tsx`
نفس الـ validation على المبلغ.

