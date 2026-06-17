-- ─────────────────────────────────────────────────────────────
-- R4.1: Realtime channel access control
-- المشكلة: realtime.messages بلا سياسات → أي مستخدم مسجّل يشترك في أي قناة
-- ويستقبل تحديثات لايف على income/expenses/accounts/payment_invoices إلخ
-- ─────────────────────────────────────────────────────────────

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- الناظر والمحاسب: وصول كامل لكل القنوات
DROP POLICY IF EXISTS "Admin and accountant full realtime access" ON realtime.messages;
CREATE POLICY "Admin and accountant full realtime access"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role)
  );

-- المستفيد/الواقف: قنوات شخصية فقط
--   notifications:{auth.uid()}   ← قناة إشعارات المستخدم
--   user:{auth.uid()}:*          ← قنوات شخصية (chats, presence)
DROP POLICY IF EXISTS "Beneficiary and waqif scoped realtime topics" ON realtime.messages;
CREATE POLICY "Beneficiary and waqif scoped realtime topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'beneficiary'::public.app_role)
      OR public.has_role(auth.uid(), 'waqif'::public.app_role)
    )
    AND (
      realtime.topic() = ('notifications:' || auth.uid()::text)
      OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
    )
  );

-- broadcast/presence من العميل: نفس القيود
DROP POLICY IF EXISTS "Authenticated can write to own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can write to own realtime topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role)
    OR (
      (
        public.has_role(auth.uid(), 'beneficiary'::public.app_role)
        OR public.has_role(auth.uid(), 'waqif'::public.app_role)
      )
      AND (
        realtime.topic() = ('notifications:' || auth.uid()::text)
        OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
      )
    )
  );