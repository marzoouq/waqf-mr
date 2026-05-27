## خطة التنظيف — توحيد بيئتي التطوير والإنتاج

### الخطوة 1 — حذف 5 سياسات تخزين قديمة (مخطط)

إنشاء migration جديد يحذف السياسات الـ 5 المتبقية في Live على `storage.objects` والتي تم حذفها سابقاً في Test:

```sql
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
```

- يُطبّق على Test فوراً، ثم على Live عند النشر التالي.
- يُغلق الثغرة الأمنية السابقة (`Authenticated users can view invoices`).
- لا يؤثر على الكود — السياسات الأساسية الحالية تبقى كما هي.

### الخطوة 2 — تنظيف بيانات Live التجريبية (يدوي)

البيانات الزائدة في Live (تجريبية قبل الإطلاق):
- 14 عقد إضافي في `contracts`
- 109 فاتورة دفعة في `payment_invoices`

**قبل التنفيذ**: سأعرض لك قائمة العقود الـ 14 والفواتير الـ 109 (الأرقام/المستأجرين/التواريخ/المبالغ) لمراجعتها وتأكيد أنها تجريبية وليست إنتاجية فعلية.

بعد تأكيدك، سأُجهّز script `BEGIN…COMMIT` آمن:
```sql
BEGIN;
DELETE FROM payment_invoices WHERE id IN (...);
DELETE FROM contract_fiscal_allocations WHERE contract_id IN (...);
DELETE FROM income WHERE contract_id IN (...);
DELETE FROM contracts WHERE id IN (...);
COMMIT;
```
تُشغّله أنت من Cloud View → Run SQL مع اختيار **Live**.

### الخطوة 3 — التحقق النهائي

بعد النشر وتنفيذ الـ script:
- إعادة عدّ السياسات: يجب 15/15 في كلا البيئتين.
- إعادة عدّ السجلات: contracts/payment_invoices/income متطابقة منطقياً.
- جولة سريعة على بطاقات لوحات التحكم في Live للتأكد من اختفاء البيانات المحذوفة.

### ملاحظات

- بيانات `income` (23 في Test مقابل 15 في Live) لن تُلمس — البيانات لا تُزامن بين البيئتين بطبيعة Lovable Cloud، و Test يحتفظ ببيانات تجريبية مستقلة.
- لا تغييرات على كود الواجهة مطلوبة — البطاقات تقرأ مباشرة من قاعدة Live.
