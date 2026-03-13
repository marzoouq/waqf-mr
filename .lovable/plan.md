

# معالجة الملاحظتين الأمنيتين: تقييد وصول waqif/beneficiary للبيانات الحساسة

## المشكلة

1. **جدول `beneficiaries`**: سياسة RLS تسمح لدور `waqif` بقراءة جميع الصفوف بما فيها `national_id` و `bank_account` المشفرة
2. **جدول `contracts`**: سياسة RLS تسمح لدوري `beneficiary` و `waqif` بقراءة `tenant_id_number` وبيانات المستأجر الشخصية

العروض الآمنة (`beneficiaries_safe`, `contracts_safe`) تمويه البيانات بالفعل، لكن الجداول الأصلية لا تزال مكشوفة عبر RLS.

## الحل

تعديل سياسات RLS على الجدولين لمنع الوصول المباشر من الأدوار غير المميزة، مع إبقاء العروض الآمنة كقناة القراءة الوحيدة.

### Migration واحدة تنفذ:

**1. جدول `beneficiaries`** — تعديل سياسة SELECT:
- إزالة `waqif` من السياسة الحالية `Beneficiaries can view their own data`
- الواقف سيقرأ حصراً من `beneficiaries_safe` (يرث RLS عبر `security_invoker`)

**2. جدول `contracts`** — تعديل سياسة SELECT:
- إزالة `beneficiary` و `waqif` من سياسة `Authorized roles can view contracts`
- إضافة سياسة جديدة تسمح لهما بالقراءة من `contracts` فقط عبر العرض الآمن (أو منعهم كلياً من الجدول الخام)

> **ملاحظة مهمة**: العروض الآمنة تستخدم `security_invoker = true`، مما يعني أنها ترث RLS من الجدول الأصلي. إذا منعنا beneficiary/waqif من الجدول الأصلي، فلن يستطيعوا القراءة من العرض أيضاً. الحل: تحويل العروض إلى `SECURITY DEFINER` (تعمل بصلاحيات مالك العرض).

### الخطة التفصيلية:

```text
1. إعادة إنشاء beneficiaries_safe بـ SECURITY DEFINER
   (بدلاً من security_invoker، ليتجاوز RLS)

2. إعادة إنشاء contracts_safe بـ SECURITY DEFINER
   (نفس المنطق)

3. منح SELECT على العروض لـ authenticated فقط

4. تعديل RLS على beneficiaries:
   إزالة waqif من سياسة SELECT

5. تعديل RLS على contracts:
   إزالة beneficiary و waqif من سياسة SELECT

6. تحديث docs/SECURITY-KNOWLEDGE.md
```

### تأثير على الواجهة الأمامية
- **لا تغيير مطلوب**: صفحات المستفيد تستخدم `useBeneficiariesSafe` بالفعل
- **تغيير مطلوب في `useContracts`**: صفحات المستفيد تقرأ من `contracts` مباشرة — يجب إضافة هوك `useContractsSafe` يقرأ من `contracts_safe` واستخدامه في صفحات المستفيد/الواقف

### ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration SQL | إعادة إنشاء العروض + تعديل RLS |
| `src/hooks/useContracts.ts` | إضافة `useContractsSafe` / `useContractsSafeByFiscalYear` |
| `src/pages/beneficiary/ContractsViewPage.tsx` | استخدام الهوك الآمن |
| `src/pages/beneficiary/WaqifDashboard.tsx` | استخدام الهوك الآمن |
| `src/pages/beneficiary/DisclosurePage.tsx` | استخدام الهوك الآمن |
| `src/pages/beneficiary/MySharePage.tsx` | استخدام الهوك الآمن |
| `docs/SECURITY-KNOWLEDGE.md` | توثيق الإصلاح |

