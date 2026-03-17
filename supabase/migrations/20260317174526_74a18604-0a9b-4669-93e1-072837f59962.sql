
-- جدول سجل عمليات ZATCA
CREATE TABLE public.zatca_operation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  request_summary jsonb DEFAULT '{}',
  response_summary jsonb DEFAULT '{}',
  error_message text,
  invoice_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.zatca_operation_log ENABLE ROW LEVEL SECURITY;

-- الأدمن يقرأ فقط
CREATE POLICY "Admins can view zatca_operation_log"
  ON public.zatca_operation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- لا إدراج مباشر (فقط عبر service role)
CREATE POLICY "No direct inserts on zatca_operation_log"
  ON public.zatca_operation_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- لا تعديل
CREATE POLICY "No updates on zatca_operation_log"
  ON public.zatca_operation_log FOR UPDATE TO authenticated
  USING (false);

-- لا حذف
CREATE POLICY "No deletes on zatca_operation_log"
  ON public.zatca_operation_log FOR DELETE TO authenticated
  USING (false);

-- فهارس للأداء
CREATE INDEX idx_zatca_op_log_type ON public.zatca_operation_log(operation_type);
CREATE INDEX idx_zatca_op_log_created ON public.zatca_operation_log(created_at DESC);
