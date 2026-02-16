-- Fix conversations SELECT policy: restrict access when participant_id IS NULL to creator only
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = created_by
  OR (participant_id IS NOT NULL AND auth.uid() = participant_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);