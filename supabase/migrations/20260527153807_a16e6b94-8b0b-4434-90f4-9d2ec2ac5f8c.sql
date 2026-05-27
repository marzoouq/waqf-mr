-- Fix recurring postgres error: relation "pgmq.q_auth_emails" does not exist
-- The email-queue cron job (jobid=8) polls these two queues every 5 seconds.
-- pgmq.create() is idempotent at the table level only when the queue doesn't exist;
-- guard with EXISTS check on pgmq.meta to be safe across re-runs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'auth_emails') THEN
    PERFORM pgmq.create('auth_emails');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'transactional_emails') THEN
    PERFORM pgmq.create('transactional_emails');
  END IF;
END $$;
