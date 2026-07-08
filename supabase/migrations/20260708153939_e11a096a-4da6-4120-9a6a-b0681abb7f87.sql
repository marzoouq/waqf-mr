-- Grant EXECUTE on get_beneficiary_decrypted to authenticated users.
-- The function already enforces admin/accountant checks internally via has_role(),
-- so the missing GRANT was preventing the naaZir UI from decrypting beneficiary PII.
GRANT EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) TO authenticated;