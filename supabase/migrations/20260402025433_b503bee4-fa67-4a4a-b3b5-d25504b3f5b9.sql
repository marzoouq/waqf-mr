-- ═══════════════════════════════════════════════════════════════
-- تحسينات أمنية: beneficiaries_safe + contracts_safe + conversations
-- ═══════════════════════════════════════════════════════════════

-- 1) إعادة إنشاء beneficiaries_safe مع security_barrier
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
  WITH (security_barrier = true)
AS
SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.created_at,
  b.updated_at,
  b.user_id,
  CASE WHEN r.is_privileged THEN b.national_id ELSE NULL::text END AS national_id,
  CASE WHEN r.is_privileged THEN b.bank_account ELSE NULL::text END AS bank_account,
  CASE WHEN r.is_privileged THEN b.email ELSE NULL::text END AS email,
  CASE WHEN r.is_privileged THEN b.phone ELSE NULL::text END AS phone,
  CASE WHEN r.is_privileged THEN b.notes ELSE NULL::text END AS notes
FROM beneficiaries b
CROSS JOIN LATERAL (
  SELECT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) AS is_privileged
) r;

-- 2) إعادة إنشاء contracts_safe مع security_barrier
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
  WITH (security_barrier = true)
AS
SELECT
  c.id,
  c.property_id,
  c.unit_id,
  c.start_date,
  c.end_date,
  c.rent_amount,
  c.payment_count,
  c.payment_amount,
  c.fiscal_year_id,
  c.created_at,
  c.updated_at,
  c.status,
  c.contract_number,
  c.payment_type,
  CASE WHEN r.is_privileged THEN c.tenant_name ELSE '***'::text END AS tenant_name,
  CASE WHEN r.is_privileged THEN c.tenant_id_type ELSE NULL::text END AS tenant_id_type,
  CASE WHEN r.is_privileged THEN c.tenant_id_number ELSE NULL::text END AS tenant_id_number,
  CASE WHEN r.is_privileged THEN c.tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
  CASE WHEN r.is_privileged THEN c.tenant_crn ELSE NULL::text END AS tenant_crn,
  CASE WHEN r.is_privileged THEN c.tenant_street ELSE NULL::text END AS tenant_street,
  CASE WHEN r.is_privileged THEN c.tenant_building ELSE NULL::text END AS tenant_building,
  CASE WHEN r.is_privileged THEN c.tenant_district ELSE NULL::text END AS tenant_district,
  CASE WHEN r.is_privileged THEN c.tenant_city ELSE NULL::text END AS tenant_city,
  CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
  CASE WHEN r.is_privileged THEN c.notes ELSE NULL::text END AS notes
FROM contracts c
CROSS JOIN LATERAL (
  SELECT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) AS is_privileged
) r;

-- 3) إضافة سياسة UPDATE للمحادثات (المنشئ يمكنه تحديث حالة المحادثة)
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- 4) إضافة سياسة DELETE مقيّدة (admin فقط)
DROP POLICY IF EXISTS "Only admins can delete conversations" ON public.conversations;
CREATE POLICY "Only admins can delete conversations"
  ON public.conversations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));