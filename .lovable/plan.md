

# إصلاح خطأ 404 في رابط "حصتي من الريع"

## المشكلة
رابط الوصول السريع في لوحة المستفيد يوجه إلى `/beneficiary/my-share` بينما المسار المسجل في التطبيق هو `/beneficiary/share`.

## الإصلاح (ملفان فقط)

### 1. `src/pages/beneficiary/BeneficiaryDashboard.tsx` (سطر 47)
تغيير `path: '/beneficiary/my-share'` إلى `path: '/beneficiary/share'`

### 2. `src/pages/dashboard/AccountsPage.tsx` (سطر 274)
تغيير `'/beneficiary/my-share'` إلى `'/beneficiary/share'` في رابط الإشعار المرسل للمستفيدين عند تحديث التوزيعات.

---

إصلاح بسيط في سطرين فقط، لا يتطلب تعديلات أخرى.
