CREATE OR REPLACE FUNCTION public.clear_zatca_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.app_settings
     SET value = '', updated_at = now()
   WHERE key IN ('zatca_otp_1','zatca_otp_2') AND value != '';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.clear_zatca_otp() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_zatca_otp() TO authenticated, service_role;