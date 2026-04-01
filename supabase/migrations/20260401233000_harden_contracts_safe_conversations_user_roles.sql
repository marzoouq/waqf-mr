-- Harden contracts_safe exposure + complete conversations update model + tighten user_roles policy model

-- 1) Restrict contracts_safe to privileged roles only (admin/accountant)
CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  c.id,
  c.contract_number,
  c.property_id,
  c.unit_id,
  c.tenant_name,
  c.start_date,
  c.end_date,
  c.rent_amount,
  c.payment_type,
  c.payment_count,
  c.payment_amount,
  c.status,
  c.fiscal_year_id,
  c.created_at,
  c.updated_at,
  c.tenant_id_type,
  c.tenant_id_number,
  c.tenant_tax_number,
  c.tenant_crn,
  c.tenant_street,
  c.tenant_building,
  c.tenant_district,
  c.tenant_city,
  c.tenant_postal_code,
  c.notes
FROM public.contracts c
WHERE auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

REVOKE ALL ON public.contracts_safe FROM anon;
REVOKE ALL ON public.contracts_safe FROM PUBLIC;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- 2) Add explicit UPDATE policy for conversation owners
DROP POLICY IF EXISTS "Conversation owners can update their conversations" ON public.conversations;
CREATE POLICY "Conversation owners can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 3) Replace broad ALL policy on user_roles with explicit per-command policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
