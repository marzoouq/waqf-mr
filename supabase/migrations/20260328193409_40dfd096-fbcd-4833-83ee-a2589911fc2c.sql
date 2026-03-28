
-- فهرس مركّب على conversations لتحسين الاستعلامات
CREATE INDEX IF NOT EXISTS idx_conversations_type_status_created
  ON public.conversations(type, status, created_at DESC);

-- validation trigger لنوع المحادثة
CREATE OR REPLACE FUNCTION public.validate_conversation_type()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('chat', 'support', 'broadcast') THEN
    RAISE EXCEPTION 'نوع المحادثة غير صالح: %', NEW.type;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_conversation_type ON public.conversations;
CREATE TRIGGER trg_validate_conversation_type
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_conversation_type();

-- validation trigger لحد حجم قيم app_settings
CREATE OR REPLACE FUNCTION public.validate_app_settings_value()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.value) > 10000 THEN
    RAISE EXCEPTION 'قيمة الإعداد تتجاوز الحد المسموح (10000 حرف)';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_app_settings_value ON public.app_settings;
CREATE TRIGGER trg_validate_app_settings_value
  BEFORE INSERT OR UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_app_settings_value();
