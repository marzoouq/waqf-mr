
-- 🔴 CRITICAL: Fix messages UPDATE policy - prevent content/sender tampering
-- Drop the permissive policy that allows updating ALL columns
DROP POLICY IF EXISTS "Users can update read status" ON public.messages;

-- Recreate with explicit WITH CHECK restricting to is_read only
CREATE POLICY "Users can update read status"
ON public.messages
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  -- Only allow updating is_read, content and sender_id must remain unchanged
  content = (SELECT m.content FROM public.messages m WHERE m.id = messages.id)
  AND sender_id = (SELECT m.sender_id FROM public.messages m WHERE m.id = messages.id)
  AND conversation_id = (SELECT m.conversation_id FROM public.messages m WHERE m.id = messages.id)
);
