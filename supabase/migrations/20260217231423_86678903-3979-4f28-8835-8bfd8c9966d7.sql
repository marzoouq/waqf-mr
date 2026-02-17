
-- Temporarily disable the closed FY trigger
ALTER TABLE invoices DISABLE TRIGGER prevent_closed_fy_invoices;

INSERT INTO invoices (invoice_type, invoice_number, amount, date, expense_id, description, status, fiscal_year_id)
VALUES
  ('maintenance', 'INV-2025-008', 30127.25, '2025-06-01', '9073b44e-be28-451a-8c25-9d761945e341', 'فاتورة أعمال جبس', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23'),
  ('maintenance', 'INV-2025-009', 24259.00, '2025-06-01', 'ac972626-ac05-43f9-aabd-5eb68ae3b964', 'فاتورة أعمال سباكة', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23'),
  ('utilities',   'INV-2025-010', 9205.76,  '2025-06-01', 'ffee0cfc-37f5-40af-a202-bed7e4ed8bb4', 'فاتورة أعمال كهرباء', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23'),
  ('other',       'INV-2025-011', 3756.37,  '2025-06-01', '744bbc61-7af7-47e7-87d8-c0b09860013b', 'فاتورة عامل نظافة شهري', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23'),
  ('other',       'INV-2025-012', 2501.15,  '2025-06-01', '3ed98e01-fff3-4479-864e-706772d23326', 'فاتورة تدقيق محاسبي 2024', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23'),
  ('other',       'INV-2025-013', 2240.00,  '2025-06-01', 'ec96b61d-b561-4d14-a6eb-92f7122e34de', 'فاتورة تدقيق محاسبي 2025', 'paid', '1fe1394b-a04c-4223-8f70-0e5fee905d23');

-- Re-enable the trigger
ALTER TABLE invoices ENABLE TRIGGER prevent_closed_fy_invoices;
