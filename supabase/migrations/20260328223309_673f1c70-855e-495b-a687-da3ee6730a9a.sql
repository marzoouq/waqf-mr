-- فهرس مركّب على messages: conversation_id + created_at (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

-- فهرس لعدّ الرسائل غير المقروءة
CREATE INDEX IF NOT EXISTS idx_messages_is_read_sender
  ON public.messages (is_read, sender_id) WHERE is_read = false;

-- فهرس مركّب على notifications: user_id + is_read + created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, is_read, created_at DESC);

-- فهرس على invoice_chain: icv للترتيب + source_table للفلترة
CREATE INDEX IF NOT EXISTS idx_invoice_chain_icv
  ON public.invoice_chain (icv DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_chain_source_table
  ON public.invoice_chain (source_table);

-- فهرس جزئي لفحص السلاسل المعلّقة (PENDING)
CREATE INDEX IF NOT EXISTS idx_invoice_chain_pending
  ON public.invoice_chain (invoice_hash) WHERE invoice_hash = 'PENDING';

-- فهرس مركّب على support_tickets: created_by + created_at
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by
  ON public.support_tickets (created_by, created_at DESC);

-- فهرس على status للفلترة الإدارية
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets (status);