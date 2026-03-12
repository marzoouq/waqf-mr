

# تقرير التناقضات بين العقود والتحصيل والفواتير

بعد فحص شامل للكود، اكتشفت **5 تناقضات جوهرية** بين الأنظمة الثلاثة:

---

## التناقض 1: مسارا تحصيل مستقلان لا يتزامنان 🔴

يوجد **مساران مختلفان تماماً** لتسجيل التحصيل:

**المسار أ — أزرار +/- في تبويب العقود:**
- يستدعي `upsert_tenant_payment` RPC → يحدّث `tenant_payments.paid_months` ويُنشئ سجل `income`
- **لا يُحدّث** حالة أي فاتورة في `payment_invoices`

**المسار ب — زر "تسديد" في تبويب الفواتير:**
- يستدعي `pay_invoice_and_record_collection` RPC → يحدّث `payment_invoices.status` + `tenant_payments.paid_months` + يُنشئ `income`

**النتيجة:** إذا استخدم الناظر المسار أ (الأزرار)، تبقى الفواتير في حالة "قيد الانتظار" رغم أن الدفعة محصّلة. والعكس صحيح: إذا ألغى التسديد من الفواتير، يتغير `paid_months` لكن الأرقام في تبويب التحصيل قد تختلف.

---

## التناقض 2: تقرير التحصيل يقرأ `tenant_payments` فقط 🔴

- `CollectionReport` يعتمد على `paymentsMap` المبني من `tenant_payments.paid_months`
- `PaymentInvoicesTab` يعتمد على `payment_invoices.status`
- **لا يوجد تزامن** بينهما: يمكن أن يكون `paid_months = 3` لكن الفواتير المسددة = 5 أو العكس

---

## التناقض 3: تكرار سجلات الدخل 🟡

كلا المسارين ينشئ سجلات `income` بشكل مستقل:
- `upsert_tenant_payment` ينشئ سجل دخل عند زيادة `paid_months`
- `pay_invoice_and_record_collection` ينشئ سجل دخل عند تسديد الفاتورة

إذا استُخدم المساران معاً لنفس العقد، **تتضاعف سجلات الدخل**.

---

## التناقض 4: `generate_contract_invoices` يحذف الفواتير المعلقة 🟡

```sql
DELETE FROM payment_invoices
WHERE contract_id = p_contract_id AND status IN ('pending', 'overdue');
```

عند إعادة توليد الفواتير (زر "توليد فواتير جميع العقود"):
- تُحذف الفواتير غير المسددة ثم تُعاد
- هذا يفقد بيانات `zatca_uuid` و`notes` المسجلة سابقاً
- لا يتأثر `tenant_payments.paid_months` بهذا الحذف → تناقض إضافي

---

## التناقض 5: تبويب التحصيل يعرض العقود النشطة فقط 🟡

```typescript
const activeContracts = contracts.filter(c => c.status === 'active');
```

بينما `PaymentInvoicesTab` يعرض **كل الفواتير** بما فيها فواتير العقود المنتهية. فإذا انتهى عقد وله فواتير متأخرة، تظهر في تبويب الفواتير لكنها تختفي من تقرير التحصيل.

---

## خطة الإصلاح المقترحة

### 1. توحيد مسار التحصيل (الأهم)
- إزالة أزرار +/- من جدول العقود
- جعل تسديد الفاتورة هو المسار الوحيد للتحصيل
- تقرير التحصيل يقرأ من `payment_invoices` (عدد المسددة) بدلاً من `tenant_payments`

### 2. إصلاح تقرير التحصيل
- تغيير مصدر البيانات من `paymentsMap` (tenant_payments) إلى عدد الفواتير المسددة فعلياً من `payment_invoices`
- إضافة عمود "عدد الفواتير المسددة" بجانب "عدد الدفعات"

### 3. حماية توليد الفواتير
- عدم حذف الفواتير المعلقة التي لها بيانات ZATCA مسجلة
- استخدام `ON CONFLICT DO UPDATE` بدلاً من الحذف

### 4. شمول العقود المنتهية في التحصيل
- تغيير الفلتر ليشمل العقود التي لها فواتير غير مسددة حتى لو انتهت

### الملفات المتأثرة:
- `src/pages/dashboard/ContractsPage.tsx` — إزالة أزرار +/- وpaymentsMap
- `src/components/contracts/CollectionReport.tsx` — تغيير مصدر البيانات
- `src/hooks/usePaymentInvoices.ts` — إضافة hook لحساب الدفعات المسددة لكل عقد
- `generate_contract_invoices` SQL — حماية الفواتير ذات بيانات ZATCA

