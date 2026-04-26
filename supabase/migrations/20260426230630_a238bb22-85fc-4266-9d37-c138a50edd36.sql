ALTER PUBLICATION supabase_realtime ADD TABLE
  public.properties,
  public.units,
  public.beneficiaries,
  public.tenant_payments,
  public.expense_budgets,
  public.advance_carryforward,
  public.annual_report_items,
  public.annual_report_status,
  public.invoices,
  public.invoice_items;

ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.units REPLICA IDENTITY FULL;
ALTER TABLE public.beneficiaries REPLICA IDENTITY FULL;
ALTER TABLE public.tenant_payments REPLICA IDENTITY FULL;
ALTER TABLE public.expense_budgets REPLICA IDENTITY FULL;
ALTER TABLE public.advance_carryforward REPLICA IDENTITY FULL;
ALTER TABLE public.annual_report_items REPLICA IDENTITY FULL;
ALTER TABLE public.annual_report_status REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.invoice_items REPLICA IDENTITY FULL;