
-- Fix the RESTRICTIVE policy (correct syntax: AS RESTRICTIVE before FOR)
DROP POLICY IF EXISTS "Restrict unpublished fiscal year data on invoice_items" ON public.invoice_items;
CREATE POLICY "Restrict unpublished fiscal year data on invoice_items" ON public.invoice_items
  AS RESTRICTIVE FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR (EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND invoice_items.invoice_source = 'invoices'
        AND is_fiscal_year_accessible(i.fiscal_year_id)
    ))
    OR (EXISTS (
      SELECT 1 FROM payment_invoices pi
      WHERE pi.id = invoice_items.invoice_id
        AND invoice_items.invoice_source = 'payment_invoices'
        AND is_fiscal_year_accessible(pi.fiscal_year_id)
    ))
  );

-- 19. invoice_items — permissive SELECT (may have been applied, re-apply safely)
DROP POLICY IF EXISTS "Authorized roles can view invoice_items" ON public.invoice_items;
CREATE POLICY "Authorized roles can view invoice_items" ON public.invoice_items
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 20. invoices
DROP POLICY IF EXISTS "Authorized roles can view invoices" ON public.invoices;
CREATE POLICY "Authorized roles can view invoices" ON public.invoices
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 21. messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 22. payment_invoices
DROP POLICY IF EXISTS "Authorized roles can view payment_invoices" ON public.payment_invoices;
CREATE POLICY "Authorized roles can view payment_invoices" ON public.payment_invoices
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 23. properties
DROP POLICY IF EXISTS "Authorized roles can view properties" ON public.properties;
CREATE POLICY "Authorized roles can view properties" ON public.properties
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 24. support_ticket_replies
DROP POLICY IF EXISTS "Accountants can view non-internal replies" ON public.support_ticket_replies;
CREATE POLICY "Accountants can view non-internal replies" ON public.support_ticket_replies
  FOR SELECT USING (
    has_role(auth.uid(), 'accountant'::app_role)
    AND is_internal = false
  );

-- 25. support_tickets
DROP POLICY IF EXISTS "Accountants can view all tickets" ON public.support_tickets;
CREATE POLICY "Accountants can view all tickets" ON public.support_tickets
  FOR SELECT USING (
    has_role(auth.uid(), 'accountant'::app_role)
  );

-- 26. tenant_payments
DROP POLICY IF EXISTS "Admin and accountant can view tenant_payments" ON public.tenant_payments;
CREATE POLICY "Admin and accountant can view tenant_payments" ON public.tenant_payments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 27. units
DROP POLICY IF EXISTS "Authorized roles can view units" ON public.units;
CREATE POLICY "Authorized roles can view units" ON public.units
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
  );
