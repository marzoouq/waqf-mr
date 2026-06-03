-- إزالة جدولة كرون مكررة لفحص انتهاء العقود
-- 'check-contract-expiry-daily' (06:00) و 'check-expiry-daily' (08:00) تستدعيان نفس الدالة cron_check_contract_expiry
-- نُبقي على 08:00 ونحذف 06:00. الدالة نفسها لا تُحذف.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-contract-expiry-daily') THEN
    PERFORM cron.unschedule('check-contract-expiry-daily');
  END IF;
END $$;