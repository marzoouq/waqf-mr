
ALTER TABLE accounts ADD COLUMN fiscal_year_id UUID REFERENCES fiscal_years(id);

UPDATE accounts a
SET fiscal_year_id = fy.id
FROM fiscal_years fy
WHERE TRIM(a.fiscal_year) = TRIM(fy.label);

CREATE INDEX idx_accounts_fiscal_year_id ON accounts(fiscal_year_id);
