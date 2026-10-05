# تقرير الفحص الجنائي الشامل

تاريخ: 2026-10-05T02:31:12.736Z

| المؤشر | القيمة |
|---|---|
| src_files | 1123 |
| migrations | 403 |
| tables | 47 |
| security_definer_functions | 108 |
| edge_functions | 25 |
| pages | 59 |
| untested_pages | 41 |
| hooks | 292 |
| untested_hooks | 232 |
| critical | 0 |
| gap | 0 |
| info | 14 |

## CRITICAL

## GAP

## INFO

### database / policy-jwt-role (1)
- `supabase/migrations/20260403210830_9bf41e5f-46d1-44be-9121-612385faa878.sql` — سياسة تستخدم jwt_role() بدل has_role() (تحقق أنها أُعيد تعريفها لاحقاً)

### testing / edge-untested (13)
- `supabase/functions/ai-assistant` — وظيفة بلا اختبار
- `supabase/functions/auth-email-hook` — وظيفة بلا اختبار
- `supabase/functions/beneficiary-summary` — وظيفة بلا اختبار
- `supabase/functions/check-contract-expiry` — وظيفة بلا اختبار
- `supabase/functions/dashboard-summary` — وظيفة بلا اختبار
- `supabase/functions/diagnostics-edge-ping` — وظيفة بلا اختبار
- `supabase/functions/email-admin` — وظيفة بلا اختبار
- `supabase/functions/generate-invoice-pdf` — وظيفة بلا اختبار
- `supabase/functions/generate-voucher-pdf` — وظيفة بلا اختبار
- `supabase/functions/health-check` — وظيفة بلا اختبار
- `supabase/functions/mcp` — وظيفة بلا اختبار
- `supabase/functions/multi-year-summary` — وظيفة بلا اختبار
- `supabase/functions/year-comparison-summary` — وظيفة بلا اختبار
