

# إضافة إشعارات تلقائية لطلبات السُلف

## الهدف
عند تغيير حالة طلب السلفة (موافقة / رفض / صرف)، يصل إشعار فوري للمستفيد عبر نظام الإشعارات الداخلي. وعند إنشاء طلب جديد، يصل إشعار للناظر.

## التغييرات المطلوبة

### ملف واحد فقط: `src/hooks/useAdvanceRequests.ts`

**1. عند إنشاء طلب سلفة جديد (`useCreateAdvanceRequest`):**
- إرسال إشعار للناظر عبر `notifyAdmins()`:
  - العنوان: "طلب سلفة جديد"
  - الرسالة: "طلب سلفة جديد بمبلغ [X] ر.س"
  - الرابط: `/dashboard/beneficiaries` (تبويب طلبات السُلف)

**2. عند تحديث حالة الطلب (`useUpdateAdvanceStatus`):**

تعديل الـ mutation ليقبل بيانات إضافية (اسم المستفيد + user_id + المبلغ) لإرسال الإشعار المناسب:

| الحالة | المستلم | العنوان | الرسالة |
|--------|---------|---------|---------|
| approved | المستفيد (user_id) | تمت الموافقة على طلب السلفة | تمت الموافقة على طلب السلفة بمبلغ [X] ر.س |
| rejected | المستفيد (user_id) | تم رفض طلب السلفة | تم رفض طلب السلفة بمبلغ [X] ر.س. السبب: [سبب الرفض] |
| paid | المستفيد (user_id) | تم صرف السلفة | تم صرف سلفة بمبلغ [X] ر.س إلى حسابك |

- يتم استخدام `notifyUser(userId, ...)` الموجودة مسبقاً
- الرابط: `/beneficiary/my-share` ليتوجه المستفيد لصفحة حصته

### ملف ثانوي: `src/components/accounts/AdvanceRequestsTab.tsx`

تعديل استدعاءات `handleApprove` و `handlePaid` و `handleReject` لتمرير بيانات المستفيد (name, user_id, amount) مع طلب تحديث الحالة، حيث أن هذه البيانات متوفرة بالفعل في `req.beneficiary`.

## التفاصيل التقنية

تحديث واجهة المعاملات في `useUpdateAdvanceStatus`:

```typescript
mutationFn: async ({
  id, status, rejection_reason,
  beneficiary_user_id, beneficiary_name, amount
}: {
  id: string;
  status: string;
  rejection_reason?: string;
  beneficiary_user_id?: string;
  beneficiary_name?: string;
  amount?: number;
})
```

في `onSuccess`، بعد إبطال الكاش، يتم استدعاء:
- `notifyUser(beneficiary_user_id, title, message, type, link)` لإشعار المستفيد
- نوع الإشعار: `success` للموافقة والصرف، `warning` للرفض

لا تغييرات في قاعدة البيانات -- النظام يستخدم جدول `notifications` الموجود مع دالة `notifyUser` الجاهزة.

