-- إزالة الوظائف المكررة القديمة (الاحتفاظ بالجديدة فقط)
SELECT cron.unschedule('archive-old-access-logs');
SELECT cron.unschedule('auto-expire-contracts-daily');
SELECT cron.unschedule('check-contract-expiry-daily');
SELECT cron.unschedule('check-late-payments-daily');
SELECT cron.unschedule('cleanup-old-notifications');
SELECT cron.unschedule('update-overdue-invoices');