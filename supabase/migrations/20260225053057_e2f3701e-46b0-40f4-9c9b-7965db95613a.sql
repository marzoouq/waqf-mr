
-- 1. جدول أرشيف سجلات الوصول
CREATE TABLE public.access_log_archive (
  id uuid NOT NULL,
  event_type text NOT NULL,
  email text,
  user_id uuid,
  target_path text,
  device_info text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- RLS: فقط الأدمن يمكنه القراءة، لا تعديل أو حذف
ALTER TABLE public.access_log_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access_log_archive"
  ON public.access_log_archive FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No inserts on access_log_archive"
  ON public.access_log_archive FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No updates on access_log_archive"
  ON public.access_log_archive FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on access_log_archive"
  ON public.access_log_archive FOR DELETE
  USING (false);

-- 2. دالة تنظيف الإشعارات المقروءة > 90 يوم
CREATE OR REPLACE FUNCTION public.cron_cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = true
    AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id,
           'صيانة تلقائية',
           'تم حذف ' || deleted_count || ' إشعار مقروء قديم (أكثر من 90 يوم)',
           'info'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$$;

-- 3. دالة أرشفة سجلات الوصول > 6 أشهر
CREATE OR REPLACE FUNCTION public.cron_archive_old_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count int;
BEGIN
  -- نقل السجلات القديمة للأرشيف
  INSERT INTO public.access_log_archive (id, event_type, email, user_id, target_path, device_info, metadata, created_at)
  SELECT id, event_type, email, user_id, target_path, device_info, metadata, created_at
  FROM public.access_log
  WHERE created_at < now() - interval '6 months'
  ON CONFLICT (id) DO NOTHING;

  -- حذف من الجدول الأصلي
  DELETE FROM public.access_log
  WHERE created_at < now() - interval '6 months';
  GET DIAGNOSTICS archived_count = ROW_COUNT;

  IF archived_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id,
           'صيانة تلقائية',
           'تم أرشفة ' || archived_count || ' سجل وصول قديم (أكثر من 6 أشهر)',
           'info'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$$;

-- 4. سحب صلاحيات التنفيذ من الأدوار العامة
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_old_notifications() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_archive_old_access_logs() FROM anon, authenticated;
