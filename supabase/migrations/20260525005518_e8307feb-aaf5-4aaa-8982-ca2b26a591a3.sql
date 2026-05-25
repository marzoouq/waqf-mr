
-- F2: RPC آمنة لتقييم التذاكر بدل تحديث مباشر يفشل بصمت
CREATE OR REPLACE FUNCTION public.rate_support_ticket(
  p_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating: must be 1..5';
  END IF;

  SELECT created_by, status INTO v_owner, v_status
  FROM public.support_tickets
  WHERE id = p_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: not ticket owner';
  END IF;

  IF v_status NOT IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Ticket must be resolved or closed before rating';
  END IF;

  UPDATE public.support_tickets
  SET rating = p_rating,
      rating_comment = NULLIF(p_comment, '')
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_support_ticket(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_support_ticket(uuid, integer, text) TO authenticated;
