-- إعادة منح صلاحية التنفيذ — الدالة تتحقق من الدور داخلياً عبر has_role
GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO authenticated;