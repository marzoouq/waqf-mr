-- تعديل cron_check_contract_expiry لاحترام إعدادات إشعارات المستفيد
-- المفتاحان الجديدان في notification_settings:
--   notify_beneficiary_contract_expiry (افتراضي false)
--   notify_beneficiary_expired_contracts (افتراضي false)
-- الناظر يبقى يستلم دائماً.

CREATE OR REPLACE FUNCTION public.cron_check_contract_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contract record;
  days_left int;
  msg text;
  ben_msg text;
  v_notify_beneficiary_expiry bool := false;
  v_notify_beneficiary_expired bool := false;
BEGIN
  -- قراءة إعدادات إشعارات المستفيد (defaults: false)
  SELECT COALESCE((value::jsonb->>'notify_beneficiary_contract_expiry')::bool, false),
         COALESCE((value::jsonb->>'notify_beneficiary_expired_contracts')::bool, false)
    INTO v_notify_beneficiary_expiry, v_notify_beneficiary_expired
    FROM app_settings WHERE key = 'notification_settings'
    LIMIT 1;

  -- 1) عقود تنتهي خلال 30 يوم
  FOR contract IN
    SELECT id, contract_number, tenant_name, end_date
    FROM contracts
    WHERE status = 'active'
      AND end_date >= CURRENT_DATE
      AND end_date <= CURRENT_DATE + interval '30 days'
  LOOP
    days_left := (contract.end_date - CURRENT_DATE);
    msg := 'عقد رقم ' || contract.contract_number || ' (' || contract.tenant_name || ') ينتهي خلال ' || days_left || ' يوم';
    ben_msg := 'أحد العقود قارب على الانتهاء خلال ' || days_left || ' يوم';

    -- إشعار الأدمن — يُرسل دائماً
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE message = msg AND created_at >= CURRENT_DATE::timestamptz AND type = 'warning'
      LIMIT 1
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT ur.user_id, 'تنبيه: عقد قارب على الانتهاء', msg, 'warning', '/dashboard/contracts'
      FROM user_roles ur WHERE ur.role = 'admin';
    END IF;

    -- إشعار المستفيدين — فقط إن فعّله الناظر
    IF v_notify_beneficiary_expiry THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE message = ben_msg AND created_at >= CURRENT_DATE::timestamptz AND type = 'warning'
        LIMIT 1
      ) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        SELECT b.user_id, 'تنبيه: عقد قارب على الانتهاء', ben_msg, 'warning', '/beneficiary/notifications'
        FROM beneficiaries b WHERE b.user_id IS NOT NULL;
      END IF;
    END IF;
  END LOOP;

  -- 2) تذكير أسبوعي بالعقود المنتهية (أيام الأحد)
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    DECLARE
      expired_total int;
      expired_msg text;
      expired_ben_msg text;
    BEGIN
      SELECT count(*) INTO expired_total FROM contracts WHERE status = 'expired';
      IF expired_total > 0 THEN
        expired_msg := 'يوجد ' || expired_total || ' عقد منتهي لم يتم تجديده';
        expired_ben_msg := 'يوجد عقود منتهية بحاجة إلى متابعة من الناظر';

        -- للأدمن — دائماً
        IF NOT EXISTS (
          SELECT 1 FROM notifications WHERE message = expired_msg AND created_at >= CURRENT_DATE::timestamptz LIMIT 1
        ) THEN
          INSERT INTO notifications (user_id, title, message, type, link)
          SELECT ur.user_id, 'تذكير: عقود منتهية تحتاج تجديد', expired_msg, 'warning', '/dashboard/contracts'
          FROM user_roles ur WHERE ur.role = 'admin';
        END IF;

        -- للمستفيد — فقط إن فعّله الناظر
        IF v_notify_beneficiary_expired THEN
          IF NOT EXISTS (
            SELECT 1 FROM notifications WHERE message = expired_ben_msg AND created_at >= CURRENT_DATE::timestamptz LIMIT 1
          ) THEN
            INSERT INTO notifications (user_id, title, message, type, link)
            SELECT b.user_id, 'تذكير: عقود منتهية', expired_ben_msg, 'info', '/beneficiary/notifications'
            FROM beneficiaries b WHERE b.user_id IS NOT NULL;
          END IF;
        END IF;
      END IF;
    END;
  END IF;
END;
$function$;