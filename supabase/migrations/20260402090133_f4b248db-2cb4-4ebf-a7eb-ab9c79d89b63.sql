-- فواتير الدفع المعلقة (الاستعلام الأكثر تكراراً)
CREATE INDEX IF NOT EXISTS idx_payment_invoices_pending
  ON public.payment_invoices (due_date ASC)
  WHERE status = 'pending';

-- فواتير الدفع المتأخرة
CREATE INDEX IF NOT EXISTS idx_payment_invoices_overdue
  ON public.payment_invoices (due_date ASC)
  WHERE status = 'overdue';

-- الفواتير العامة المعلقة
CREATE INDEX IF NOT EXISTS idx_invoices_pending
  ON public.invoices (date DESC)
  WHERE status = 'pending';

-- العقود النشطة مع العقار والوحدة (استعلامات الإشغال ولوحة التحكم)
CREATE INDEX IF NOT EXISTS idx_contracts_active
  ON public.contracts (property_id, unit_id)
  WHERE status = 'active';

-- العقود النشطة القريبة من الانتهاء (تنبيهات cron)
CREATE INDEX IF NOT EXISTS idx_contracts_active_expiry
  ON public.contracts (end_date ASC)
  WHERE status = 'active';