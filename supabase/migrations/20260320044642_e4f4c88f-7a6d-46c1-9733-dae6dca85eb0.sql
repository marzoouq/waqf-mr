CREATE POLICY "Users can update own webauthn credentials"
ON public.webauthn_credentials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);