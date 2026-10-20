DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND status = 'open' AND assigned_to IS NULL);

CREATE OR REPLACE FUNCTION public.validate_support_ticket()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'حالة التذكرة غير صالحة: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'أولوية التذكرة غير صالحة: %', NEW.priority;
  END IF;
  IF NEW.category NOT IN ('general', 'technical', 'financial', 'billing') THEN
    RAISE EXCEPTION 'تصنيف التذكرة غير صالح: %', NEW.category;
  END IF;
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'support'::app_role) THEN
    IF NEW.status <> 'open' OR NEW.assigned_to IS NOT NULL OR NEW.resolved_at IS NOT NULL
       OR NEW.resolution_notes IS NOT NULL OR NEW.rating IS NOT NULL OR NEW.rating_comment IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن إنشاء تذكرة إلا بحالة مفتوحة ودون حقول المعالجة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.income ADD CONSTRAINT income_amount_non_negative CHECK (amount >= 0);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_non_negative CHECK (amount >= 0);