CREATE INDEX IF NOT EXISTS idx_access_log_user_event_created
  ON public.access_log (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);