
CREATE TABLE public.tenant_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  paid_months INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id)
);

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenant_payments"
ON public.tenant_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view tenant_payments"
ON public.tenant_payments
FOR SELECT
USING (true);

CREATE TRIGGER update_tenant_payments_updated_at
BEFORE UPDATE ON public.tenant_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
