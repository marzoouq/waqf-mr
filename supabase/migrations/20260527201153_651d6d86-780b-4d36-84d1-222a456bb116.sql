
DO $$
BEGIN
  SET LOCAL session_replication_role = replica;
  INSERT INTO public.contracts
  SELECT (jsonb_populate_record(NULL::public.contracts, old_data)).*
  FROM public.audit_log
  WHERE table_name='contracts'
    AND operation='DELETE'
    AND (old_data->>'fiscal_year_id')='1fe1394b-a04c-4223-8f70-0e5fee905d23'
  ON CONFLICT (id) DO NOTHING;
END $$;
