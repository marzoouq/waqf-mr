-- ============================================
-- 1) Storage: invoices bucket — قصر القراءة على admin/accountant
-- ============================================
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;

CREATE POLICY "Admin and accountant can view invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  )
);

-- ============================================
-- 2) realtime.messages — تفويض قنوات دقيق
-- ============================================
DROP POLICY IF EXISTS "Authorized realtime subscriptions" ON realtime.messages;

-- (أ) الناظر والمحاسب: وصول كامل لكل القنوات
CREATE POLICY "Admins and accountants full realtime access"
ON realtime.messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- (ب) باقي المستخدمين: فقط القنوات الخاصة بمعرّفهم
CREATE POLICY "Users can subscribe to own scoped topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE ('notifications:' || auth.uid()::text)
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
);
