
-- Step 1: Create the encryption trigger
DROP TRIGGER IF EXISTS encrypt_beneficiary_pii_trigger ON public.beneficiaries;
CREATE TRIGGER encrypt_beneficiary_pii_trigger
BEFORE INSERT OR UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_beneficiary_pii();

-- Step 2: Disable trigger to avoid double encryption
ALTER TABLE public.beneficiaries DISABLE TRIGGER encrypt_beneficiary_pii_trigger;

-- Step 3: Encrypt existing plaintext data
UPDATE public.beneficiaries
SET 
  national_id = CASE 
    WHEN national_id IS NOT NULL AND national_id != '' AND LENGTH(national_id) < 50
    THEN encode(pgp_sym_encrypt(national_id, (SELECT value FROM app_settings WHERE key = 'pii_encryption_key')), 'base64')
    ELSE national_id
  END,
  bank_account = CASE
    WHEN bank_account IS NOT NULL AND bank_account != '' AND LENGTH(bank_account) < 50  
    THEN encode(pgp_sym_encrypt(bank_account, (SELECT value FROM app_settings WHERE key = 'pii_encryption_key')), 'base64')
    ELSE bank_account
  END
WHERE (national_id IS NOT NULL AND national_id != '' AND LENGTH(national_id) < 50)
   OR (bank_account IS NOT NULL AND bank_account != '' AND LENGTH(bank_account) < 50);

-- Step 4: Re-enable trigger
ALTER TABLE public.beneficiaries ENABLE TRIGGER encrypt_beneficiary_pii_trigger;
