

# تقرير فحص لوحة الناظر وفروعها

بعد فحص شامل لجميع ملفات لوحة الناظر والصفحات الفرعية والفواتير الضريبية والتنقل، رصدت **6 مشكلات** تحتاج إصلاح:

---

## المشكلة 1: عمود "نوع الدفع" في جدول العقود غير متسق 🔴

في سطر 464 من `ContractsPage.tsx`، عمود Desktop يعرض نوع الدفع هكذا:
```typescript
contract.payment_type === 'monthly' ? 'شهري' : contract.payment_type === 'annual' ? 'سنوي' : `متعدد (${contract.payment_count} دفعات)`
```
هذا يتجاهل `quarterly` و `semi_annual` ويعرضهما كـ "متعدد (X دفعات)" بينما الدالة `getPaymentTypeLabel` في سطر 277 تعالجهما بشكل صحيح. يجب استخدام `getPaymentTypeLabel` في جدول Desktop أيضاً.

---

## المشكلة 2: `getExpectedPaymentsFallback` في CollectionReport لا تدعم `quarterly`/`semi_annual` 🟡

في سطر 48 من `CollectionReport.tsx`:
```typescript
const paymentCount = contract.payment_type === 'monthly' ? 12
  : contract.payment_type === 'annual' ? 1
  : (contract.payment_count || 1);
```
نفس المنطق في سطر 106. الدالة `getPaymentCount` الموحدة في `ContractsPage` تدعم `quarterly` (4) و `semi_annual` (2)، لكنها غير مُستخدمة هنا.

**الإصلاح:** نقل `getPaymentCount` إلى ملف مشترك واستخدامه في كل الأماكن.

---

## المشكلة 3: صفحة ZATCA لا تعرض ترقيم الصفحات (Pagination) 🟡

`ZatcaManagementPage` تعرض حتى 200 فاتورة في جدول واحد بدون pagination. مع تزايد الفواتير، ستصبح الصفحة بطيئة وصعبة الاستخدام.

**الإصلاح:** إضافة `TablePagination` لتبويب الفواتير في صفحة ZATCA.