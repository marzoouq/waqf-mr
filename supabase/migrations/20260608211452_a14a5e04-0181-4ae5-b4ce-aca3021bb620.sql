-- Lock down summary RPCs from direct client access. They are exposed exclusively
-- via role-checked Edge Functions: dashboard-summary, multi-year-summary,
-- year-comparison-summary, ai-assistant.

REVOKE EXECUTE ON FUNCTION public.get_dashboard_full_summary(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_multi_year_summary(uuid[])          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_year_comparison_summary(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_income_summary_by_source(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_expense_summary_by_type(uuid)       FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.get_dashboard_full_summary(uuid)        TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_multi_year_summary(uuid[])          TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_year_comparison_summary(uuid, uuid) TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_income_summary_by_source(uuid)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_expense_summary_by_type(uuid)       TO service_role;