-- تحسين أداء التقارير: فهارس مركّبة للاستعلامات الأكثر تكراراً
-- بناءً على pg_stat_statements: أعلى استعلامَين إجمالاً في زمن التنفيذ.

-- 1) payment_invoices: filter fiscal_year + sort by due_date (22.8s total, 1008 calls)
CREATE INDEX IF NOT EXISTS idx_payment_invoices_fy_due_date
  ON public.payment_invoices (fiscal_year_id, due_date ASC);

-- 2) access_log: filter event_type + sort by created_at DESC (20s total, 561 calls)
CREATE INDEX IF NOT EXISTS idx_access_log_event_created
  ON public.access_log (event_type, created_at DESC);

-- تحليل فوري لتحديث pg_stats بعد الفهرسة
ANALYZE public.payment_invoices;
ANALYZE public.access_log;