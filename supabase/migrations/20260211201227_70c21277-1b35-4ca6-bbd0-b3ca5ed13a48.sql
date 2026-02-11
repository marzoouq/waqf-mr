
-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'شقة',
  floor TEXT,
  area NUMERIC,
  status TEXT NOT NULL DEFAULT 'شاغرة',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unit_id to contracts (nullable, ON DELETE SET NULL)
ALTER TABLE public.contracts ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage units"
ON public.units
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authorized roles can view
CREATE POLICY "Authorized roles can view units"
ON public.units
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'waqif'::app_role) OR 
  has_role(auth.uid(), 'beneficiary'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
