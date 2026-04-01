-- Hardening beneficiaries_safe visibility + Realtime channel authorization

-- 1) Ensure beneficiaries_safe respects caller context and limits rows to allowed viewers only
CREATE OR REPLACE VIEW public.beneficiaries_safe
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.created_at,
  b.updated_at,
  b.user_id,
  CASE
    WHEN r.is_privileged OR r.is_owner THEN b.national_id
    ELSE NULL::text
  END AS national_id,
  CASE
    WHEN r.is_privileged OR r.is_owner THEN b.bank_account
    ELSE NULL::text
  END AS bank_account,
  CASE
    WHEN r.is_privileged OR r.is_owner THEN b.email
    ELSE NULL::text
  END AS email,
  CASE
    WHEN r.is_privileged OR r.is_owner THEN b.phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN r.is_privileged OR r.is_owner THEN b.notes
    ELSE NULL::text
  END AS notes
FROM public.beneficiaries b
CROSS JOIN LATERAL (
  SELECT
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'accountant'::app_role)
    ) AS is_privileged,
    (b.user_id = auth.uid()) AS is_owner,
    public.has_role(auth.uid(), 'waqif'::app_role) AS is_waqif
) r
WHERE auth.uid() IS NOT NULL
  AND (r.is_owner OR r.is_privileged OR r.is_waqif);

REVOKE ALL ON public.beneficiaries_safe FROM anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- 2) Enforce Realtime topic-level authorization for authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe allowed realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe allowed realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User-scoped channels
    realtime.topic() LIKE ('realtime:notifications-' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('realtime:chat-conv-' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('realtime:unread-counts-' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('realtime:admin-realtime-alerts-' || auth.uid()::text || '%')

    -- Role-scoped dashboard channels
    OR (
      realtime.topic() LIKE 'realtime:admin-dashboard-realtime%'
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'accountant'::app_role)
      )
    )
    OR (
      realtime.topic() LIKE 'realtime:waqif-dashboard-realtime%'
      AND public.has_role(auth.uid(), 'waqif'::app_role)
    )

    -- Beneficiary dashboard distribution channel: beneficiary-dist-<beneficiary_uuid>
    OR (
      realtime.topic() ~ '^realtime:beneficiary-dist-[0-9a-fA-F-]{36}.*$'
      AND EXISTS (
        SELECT 1
        FROM public.beneficiaries b
        WHERE b.id::text = regexp_replace(
          realtime.topic(),
          '^realtime:beneficiary-dist-([0-9a-fA-F-]{36}).*$',
          '\\1'
        )
          AND (
            b.user_id = auth.uid()
            OR public.has_role(auth.uid(), 'admin'::app_role)
            OR public.has_role(auth.uid(), 'accountant'::app_role)
            OR public.has_role(auth.uid(), 'waqif'::app_role)
          )
      )
    )

    -- Chat message channel: chat-msg-<conversation_uuid>
    OR (
      realtime.topic() ~ '^realtime:chat-msg-[0-9a-fA-F-]{36}.*$'
      AND EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id::text = regexp_replace(
          realtime.topic(),
          '^realtime:chat-msg-([0-9a-fA-F-]{36}).*$',
          '\\1'
        )
          AND (
            c.created_by = auth.uid()
            OR c.participant_id = auth.uid()
            OR public.has_role(auth.uid(), 'admin'::app_role)
          )
      )
    )
  )
);
