
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'beneficiary', 'waqif');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Properties table (العقارات)
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_number TEXT NOT NULL UNIQUE,
    property_type TEXT NOT NULL,
    location TEXT NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Contracts table (العقود)
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT NOT NULL UNIQUE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    tenant_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Income table (الدخل)
CREATE TABLE public.income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    property_id UUID REFERENCES public.properties(id),
    contract_id UUID REFERENCES public.contracts(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- Expenses table (المصروفات)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    property_id UUID REFERENCES public.properties(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Beneficiaries table (المستفيدين)
CREATE TABLE public.beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    share_percentage DECIMAL(5,2) NOT NULL,
    phone TEXT,
    email TEXT,
    bank_account TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- Accounts table (الحسابات)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year TEXT NOT NULL,
    total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
    admin_share DECIMAL(12,2) NOT NULL DEFAULT 0,
    waqif_share DECIMAL(12,2) NOT NULL DEFAULT 0,
    waqf_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Distributions table (التوزيعات)
CREATE TABLE public.distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Properties policies
CREATE POLICY "Authenticated users can view properties"
ON public.properties FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage properties"
ON public.properties FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Contracts policies
CREATE POLICY "Authenticated users can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage contracts"
ON public.contracts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Income policies
CREATE POLICY "Authenticated users can view income"
ON public.income FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage income"
ON public.income FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Expenses policies
CREATE POLICY "Authenticated users can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage expenses"
ON public.expenses FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Beneficiaries policies
CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'waqif'));

CREATE POLICY "Admins can manage beneficiaries"
ON public.beneficiaries FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Accounts policies
CREATE POLICY "Authenticated users can view accounts"
ON public.accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage accounts"
ON public.accounts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Distributions policies
CREATE POLICY "Users can view their own distributions"
ON public.distributions FOR SELECT
TO authenticated
USING (
    beneficiary_id IN (SELECT id FROM public.beneficiaries WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'waqif')
);

CREATE POLICY "Admins can manage distributions"
ON public.distributions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiaries_updated_at
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
