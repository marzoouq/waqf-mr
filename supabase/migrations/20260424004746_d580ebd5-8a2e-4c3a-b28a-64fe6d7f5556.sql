-- تنظيف لمرة واحدة: إزالة إشعارات العقود القديمة من صناديق المستفيدين
DELETE FROM public.notifications
WHERE link = '/beneficiary/notifications'
  AND (title LIKE '%عقد%' OR message LIKE '%عقد%')
  AND user_id IN (SELECT user_id FROM public.beneficiaries WHERE user_id IS NOT NULL);