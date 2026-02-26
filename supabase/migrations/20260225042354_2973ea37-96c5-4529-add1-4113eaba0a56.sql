
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Function: auto-expire contracts past end_date
CREATE OR REPLACE FUNCTION public.cron_auto_expire_contracts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  expired_count int;
BEGIN
  WITH expired AS (
    UPDATE contracts 
    SET status = 'expired', updated_at = now()
    WHERE status = 'active' AND end_date < CURRENT_DATE
    RETURNING id
  )
  SELECT count(*) INTO expired_count FROM expired;
  
  IF expired_count > 0 THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
           'عقود منتهية',
           'تم تحديث ' || expired_count || ' عقد إلى حالة "منتهي" تلقائياً',
           'warning',
           '/dashboard/contracts'
    FROM user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$$;

-- Function: check contracts expiring within 30 days + overdue payments
CREATE OR REPLACE FUNCTION public.cron_check_contract_expiry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  contract record;
  days_left int;
  msg text;
  recipient record;
BEGIN
  -- 1) Contracts expiring within 30 days
  FOR contract IN
    SELECT id, contract_number, tenant_name, end_date
    FROM contracts
    WHERE status = 'active'
      AND end_date >= CURRENT_DATE
      AND end_date <= CURRENT_DATE + interval '30 days'
  LOOP
    days_left := (contract.end_date - CURRENT_DATE);
    msg := 'عقد رقم ' || contract.contract_number || ' (' || contract.tenant_name || ') ينتهي خلال ' || days_left || ' يوم';
    
    -- Skip if already notified today
    IF EXISTS (
      SELECT 1 FROM notifications 
      WHERE message = msg AND created_at >= CURRENT_DATE::timestamptz AND type = 'warning'
      LIMIT 1
    ) THEN
      CONTINUE;
    END IF;

    -- Notify admins
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'تنبيه: عقد قارب على الانتهاء', msg, 'warning', '/dashboard/contracts'
    FROM user_roles ur WHERE ur.role = 'admin';

    -- Notify beneficiaries
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT b.user_id, 'تنبيه: عقد قارب على الانتهاء', msg, 'warning', '/beneficiary/notifications'
    FROM beneficiaries b WHERE b.user_id IS NOT NULL;
  END LOOP;

  -- 2) Weekly expired contracts reminder (Sundays only, admins only)
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    DECLARE
      expired_total int;
      expired_msg text;
    BEGIN
      SELECT count(*) INTO expired_total FROM contracts WHERE status = 'expired';
      IF expired_total > 0 THEN
        expired_msg := 'يوجد ' || expired_total || ' عقد منتهي لم يتم تجديده';
        IF NOT EXISTS (
          SELECT 1 FROM notifications WHERE message = expired_msg AND created_at >= CURRENT_DATE::timestamptz LIMIT 1
        ) THEN
          INSERT INTO notifications (user_id, title, message, type, link)
          SELECT ur.user_id, 'تذكير: عقود منتهية تحتاج تجديد', expired_msg, 'warning', '/dashboard/contracts'
          FROM user_roles ur WHERE ur.role = 'admin';
        END IF;
      END IF;
    END;
  END IF;
END;
$$;

-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.cron_auto_expire_contracts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_contract_expiry() FROM PUBLIC;
