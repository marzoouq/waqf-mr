-- Add updated_at triggers to 5 tables that have the column but missing the trigger
DO $$
DECLARE
  t TEXT;
  trigger_name TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['app_settings','expense_budgets','support_tickets','annual_report_items','account_categories'])
  LOOP
    trigger_name := 'update_' || t || '_updated_at';
    -- Drop if exists then recreate (idempotent)
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      trigger_name, t
    );
  END LOOP;
END $$;