DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgmq' AND c.relname = 'q_auth_emails'
  ) THEN
    DROP TRIGGER IF EXISTS email_queue_wake_auth ON pgmq.q_auth_emails;
    CREATE TRIGGER email_queue_wake_auth
      AFTER INSERT ON pgmq.q_auth_emails
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.email_queue_wake();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgmq' AND c.relname = 'q_transactional_emails'
  ) THEN
    DROP TRIGGER IF EXISTS email_queue_wake_transactional ON pgmq.q_transactional_emails;
    CREATE TRIGGER email_queue_wake_transactional
      AFTER INSERT ON pgmq.q_transactional_emails
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.email_queue_wake();
  END IF;
END $$;