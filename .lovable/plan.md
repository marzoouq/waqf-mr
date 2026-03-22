

# إضافة تنبيهات ذكية للمستفيد

---

## الوضع الحالي

| الحدث | إشعار موجود؟ |
|-------|:---:|
| تحديث الحسابات الختامية | ✅ `notifyAllBeneficiaries` |
| تحديث التوزيعات المالية | ✅ `notifyAllBeneficiaries` |
| إقفال السنة المالية | ✅ `notifyAllBeneficiaries` |
| تغيّر حالة طلب السلفة (موافقة/رفض/صرف) | ✅ `notifyUser` للمستفيد |
| **تنفيذ التوزيع الفعلي (execute_distribution)** | ❌ **لا يوجد** |
| **طلب سلفة جديد → إشعار للمستفيد بتأكيد الاستلام** | ❌ **لا يوجد** |

---

## التغييرات المطلوبة

### 1. إشعار كل مستفيد عند تنفيذ التوزيع — `useDistribute.ts`

عند نجاح `execute_distribution`، إرسال إشعار شخصي لكل مستفيد لديه `beneficiary_user_id` بمبلغ حصته الصافية:

```
📢 صدور حصتك المالية
تم توزيع حصتك بمبلغ X ر.س. يرجى مراجعة التفاصيل.
→ رابط: /beneficiary/my-share
```

**التنفيذ:** في `onSuccess`، التكرار على `distributions` المُمررة وإرسال `notifyUser` لكل مستفيد لديه `user_id`.

يتطلب تمرير `distributions` الأصلية إلى `onSuccess` عبر `mutationFn` (إعادتها مع النتيجة).

### 2. تأكيد استلام طلب السلفة للمستفيد — `useAdvanceRequests.ts`

عند إنشاء طلب سلفة، إرسال إشعار تأكيد للمستفيد نفسه:

```
✅ تم استلام طلب السلفة
تم استلام طلبك بمبلغ X ر.س وسيتم مراجعته من قبل الناظر.
→ رابط: /beneficiary/my-share
```

**التنفيذ:** في `onSuccess` لـ `useCreateAdvanceRequest`، جلب `user_id` للمستفيد من البيانات المتاحة وإرسال `notifyUser`.

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useDistribute.ts` | إضافة `notifyUser` لكل مستفيد في `onSuccess` + تمرير distributions مع النتيجة |
| `src/hooks/useAdvanceRequests.ts` | إضافة `notifyUser` تأكيد استلام في `useCreateAdvanceRequest.onSuccess` |

