

# تنفيذ 3 إصلاحات معلّقة

## ملخص
3 إصلاحات تم اعتمادها سابقاً لكنها لم تُطبَّق على الكود الفعلي.

---

## البند 1 (MEDIUM): تحديث UserManagementPage لاستيعاب pagination

**الملف:** `src/pages/dashboard/UserManagementPage.tsx`

**المشكلة:** الـ backend يُرجع 50 مستخدم فقط مع `total` و `nextPage`، لكن الـ frontend لا يُرسل `page` ولا يعرض أزرار تنقل.

**التغييرات:**
- إضافة `const [currentPage, setCurrentPage] = useState(1)` (سطر 53)
- تحديث `queryKey` إلى `['admin-users', currentPage]` (سطر 79)
- تمرير `page: currentPage` في body الطلب (سطر 81)
- حفظ `total` و `nextPage` من الاستجابة
- تحديث عداد المستخدمين في العنوان (سطر 297) من `users.length` إلى `total`
- إضافة أزرار "السابق / التالي" أسفل الجدول مع تعطيل مناسب

---

## البند 2 (LOW): إزالة return false من SecurityGuard

**الملف:** `src/components/SecurityGuard.tsx`

**المشكلة:** `return false` لا يعمل في `addEventListener` — فقط `e.preventDefault()` هو الفعّال.

**التغييرات:**
- حذف `return false` من السطور 14, 23, 32, 41

---

## البند 3 (LOW): إضافة staleTime لـ useInvoicesByFiscalYear

**الملف:** `src/hooks/useInvoices.ts`

**التغييرات:**
- إضافة `staleTime: 60_000` بعد سطر 64 (`enabled`) للتناسق مع `useIncomeByFiscalYear`

---

## ترتيب التنفيذ
1. UserManagementPage (pagination frontend)
2. SecurityGuard (cleanup)
3. useInvoices (staleTime)

