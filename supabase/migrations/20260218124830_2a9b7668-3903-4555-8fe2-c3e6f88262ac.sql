
-- Fix: Validate participant_id on conversation INSERT
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create a stricter INSERT policy that validates participant_id
-- participant_id must be NULL or belong to a user with a role (admin, beneficiary, or waqif)
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    participant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = conversations.participant_id
    )
  )
);
