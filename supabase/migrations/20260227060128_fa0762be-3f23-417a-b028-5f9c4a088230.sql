CREATE POLICY "Restrict unpublished fiscal year data on accounts"
ON public.accounts AS RESTRICTIVE FOR SELECT
USING (is_fiscal_year_accessible(fiscal_year_id));