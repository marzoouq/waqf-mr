
-- Add missing indexes for better query performance

-- advance_requests indexes
CREATE INDEX idx_advance_requests_beneficiary_id ON public.advance_requests USING btree (beneficiary_id);
CREATE INDEX idx_advance_requests_fiscal_year_id ON public.advance_requests USING btree (fiscal_year_id);

-- distributions fiscal year index
CREATE INDEX idx_distributions_fiscal_year_id ON public.distributions USING btree (fiscal_year_id);

-- contracts fiscal year index
CREATE INDEX idx_contracts_fiscal_year_id ON public.contracts USING btree (fiscal_year_id);

-- access_log indexes for admin log viewer performance
CREATE INDEX idx_access_log_created_at ON public.access_log USING btree (created_at DESC);
CREATE INDEX idx_access_log_event_type ON public.access_log USING btree (event_type);
