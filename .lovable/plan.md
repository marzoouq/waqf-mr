

# حذف 3 سياسات Storage مكررة

## الإجراء

Migration واحدة تحذف السياسات الثلاث المكررة على `storage.objects`:

```sql
DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
```

## التفاصيل

- استخدام `IF EXISTS` لتجنب فشل الـ migration إذا حُذفت سياسة مسبقاً
- السياسة الشاملة `Role-based users can view invoices` تبقى كما هي وتغطي جميع الأدوار
- صفر تغييرات في كود التطبيق
- بعد التنفيذ: تحديث نتائج الفحص الأمني عبر `security--manage_security_finding`

