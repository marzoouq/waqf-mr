
-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Storage policies for invoices bucket
CREATE POLICY "Admins can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update invoices"
ON storage.objects FOR UPDATE
USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invoices"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  invoice_type TEXT NOT NULL, -- 'utilities', 'maintenance', 'rent', 'other'
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  property_id UUID REFERENCES public.properties(id),
  contract_id UUID REFERENCES public.contracts(id),
  expense_id UUID REFERENCES public.expenses(id),
  description TEXT,
  file_path TEXT, -- storage path
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
ON public.invoices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view invoices"
ON public.invoices FOR SELECT
USING (true);

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
