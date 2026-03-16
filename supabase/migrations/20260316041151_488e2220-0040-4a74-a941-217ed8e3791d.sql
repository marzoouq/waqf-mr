
-- إضافة فهارس للأعمدة المُستخدمة في الاستعلامات بدون فهرس
-- access_log: user_id يُستخدم في فلترة سجلات المستخدم
CREATE INDEX IF NOT EXISTS idx_access_log_user_id ON public.access_log USING btree (user_id);

-- access_log_archive: user_id للبحث في الأرشيف
CREATE INDEX IF NOT EXISTS idx_access_log_archive_user_id ON public.access_log_archive USING btree (user_id);

-- advance_carryforward: to_fiscal_year_id للربط بالسنة المالية المستهدفة
CREATE INDEX IF NOT EXISTS idx_advance_carryforward_to_fy ON public.advance_carryforward USING btree (to_fiscal_year_id);

-- annual_report_items: fiscal_year_id و property_id للفلترة
CREATE INDEX IF NOT EXISTS idx_annual_report_items_fy ON public.annual_report_items USING btree (fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_annual_report_items_property ON public.annual_report_items USING btree (property_id);

-- audit_log: user_id للبحث عن عمليات مستخدم معين
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log USING btree (user_id);

-- messages: sender_id للبحث عن رسائل مُرسل معين
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages USING btree (sender_id);

-- support_ticket_replies: sender_id لربط الردود بالمُرسل
CREATE INDEX IF NOT EXISTS idx_ticket_replies_sender ON public.support_ticket_replies USING btree (sender_id);

-- webauthn_challenges: user_id للبحث عن تحديات مستخدم
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON public.webauthn_challenges USING btree (user_id);
