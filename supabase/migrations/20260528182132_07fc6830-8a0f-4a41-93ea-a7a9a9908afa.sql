
-- Explicit deny policies for webauthn_challenges (all roles, all write operations)
CREATE POLICY "Deny anon all on webauthn_challenges"
ON public.webauthn_challenges
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Explicit write-protection for zatca_certificates (already has SELECT=false)
CREATE POLICY "No direct client inserts on zatca_certificates"
ON public.zatca_certificates
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No direct client updates on zatca_certificates"
ON public.zatca_certificates
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct client deletes on zatca_certificates"
ON public.zatca_certificates
FOR DELETE
TO authenticated, anon
USING (false);
