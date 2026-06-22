-- F1: إسقاط سياسة storage الفضفاضة على invoices bucket
-- السياسة كانت تسمح auth.role()='authenticated' بدون التحقق من الدور
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;

-- تنظيف سياسات SELECT المكررة (F15) — الإبقاء على Role-based policy فقط
DROP POLICY IF EXISTS "Admin and accountant can view invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;

-- يبقى "Role-based users can view invoices" الذي يتحقق من has_role لكل الأدوار المعنية