-- 1.2: Fix participant_id NULL issue - update RLS policy to handle NULL properly
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  (auth.uid() = created_by)
  OR (participant_id IS NOT NULL AND auth.uid() = participant_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);