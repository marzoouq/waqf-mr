-- 1) دمج المفاتيح الجديدة داخل notification_settings (JSONB merge آمن)
UPDATE public.app_settings
SET value = (
  COALESCE(value::jsonb, '{}'::jsonb)
  || jsonb_build_object(
    'notify_beneficiary_contract_expiry', false,
    'notify_beneficiary_expired_contracts', false
  )
)::text,
updated_at = now()
WHERE key = 'notification_settings';

-- إنشاء السجل إذا لم يكن موجوداً
INSERT INTO public.app_settings (key, value)
SELECT 'notification_settings',
  '{"contract_expiry":true,"contract_expiry_days":30,"payment_delays":true,"email_notifications":false,"notify_beneficiary_contract_expiry":false,"notify_beneficiary_expired_contracts":false}'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'notification_settings');

-- 2) تنظيف الإشعارات القديمة الخاصة بالعقود من صناديق المستفيدين فقط
DELETE FROM public.notifications
WHERE user_id IN (SELECT user_id FROM public.beneficiaries WHERE user_id IS NOT NULL)
  AND (
    title ILIKE '%عقد قارب%'
    OR title ILIKE '%عقود منتهية%'
    OR message ILIKE '%قارب على الانتهاء%'
    OR message ILIKE '%عقود منتهية بحاجة%'
  );