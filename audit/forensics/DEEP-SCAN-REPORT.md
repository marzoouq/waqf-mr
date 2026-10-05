# تقرير الفحص الجنائي الشامل

تاريخ: 2026-10-05T02:18:41.234Z

| المؤشر | القيمة |
|---|---|
| src_files | 1123 |
| migrations | 398 |
| tables | 47 |
| security_definer_functions | 108 |
| edge_functions | 25 |
| pages | 59 |
| untested_pages | 41 |
| hooks | 292 |
| untested_hooks | 232 |
| critical | 4 |
| gap | 2 |
| info | 54 |

## CRITICAL

### security / xss-innerhtml (1)
- `src/pages/Index.tsx` — dangerouslySetInnerHTML بلا تنقية

### edge / auth-missing (3)
- `supabase/functions/zatca-onboard` — لا تحقق من المستخدم (getUser)
- `supabase/functions/zatca-renew` — لا تحقق من المستخدم (getUser)
- `supabase/functions/zatca-report` — لا تحقق من المستخدم (getUser)

## GAP

### code / no-any (2)
- `src/components/diagnostics/LivePerformancePanel.tsx` — استخدام any بدون تبرير
- `src/hooks/data/core/inferMutationArg.ts` — استخدام any بدون تبرير

## INFO

### database / grant-missing (40)
- `supabase/migrations/20260209105205_8b1165fe-ddb3-40f1-91b7-3b1e97933600.sql` — جدول properties بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260209105205_8b1165fe-ddb3-40f1-91b7-3b1e97933600.sql` — جدول income بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260209105205_8b1165fe-ddb3-40f1-91b7-3b1e97933600.sql` — جدول expenses بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260209105205_8b1165fe-ddb3-40f1-91b7-3b1e97933600.sql` — جدول accounts بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260209105205_8b1165fe-ddb3-40f1-91b7-3b1e97933600.sql` — جدول distributions بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260210021326_3449d1ed-2a7e-4e98-8a54-6336c8cf8469.sql` — جدول app_settings بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211013903_792b043b-eaed-4926-b251-7e18a8bedf67.sql` — جدول tenant_payments بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211022031_b9a90a43-60d9-43e5-b1df-fe0c66c0ec14.sql` — جدول notifications بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211023345_a3a5a11b-c0ab-4d04-82f1-8be522dfaa32.sql` — جدول conversations بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211023345_a3a5a11b-c0ab-4d04-82f1-8be522dfaa32.sql` — جدول messages بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211030616_0971d197-0c6f-43a4-975c-d02abd1a5a3e.sql` — جدول invoices بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260211201227_70c21277-1b35-4ca6-bbd0-b3ca5ed13a48.sql` — جدول units بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260212084503_e8bccf60-f278-4c00-a15d-ae7273206efc.sql` — جدول fiscal_years بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260212084503_e8bccf60-f278-4c00-a15d-ae7273206efc.sql` — جدول audit_log بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260219172848_5d5275e3-bb54-40b4-a66b-7684043c7391.sql` — جدول waqf_bylaws بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260220020621_9f332453-13b9-43d8-bd5a-c54edc031010.sql` — جدول access_log بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260225001036_3a2ed725-dea7-4764-910b-0b9eb018ef61.sql` — جدول advance_requests بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260225035526_077383b9-c0e0-47a5-b518-dbd736356e40.sql` — جدول advance_carryforward بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260225053057_e2f3701e-46b0-40f4-9c9b-7965db95613a.sql` — جدول access_log_archive بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260225170535_7c4fd14e-6d20-4677-9065-5ca6f6eeac52.sql` — جدول webauthn_credentials بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260225170535_7c4fd14e-6d20-4677-9065-5ca6f6eeac52.sql` — جدول webauthn_challenges بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260227034454_6e8c92e1-fff8-45b6-9c16-99f264deee06.sql` — جدول rate_limits بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260227123627_e81ad630-b336-4eed-9ba7-6d97f91b3467.sql` — جدول contract_fiscal_allocations بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260227132827_7b6e383a-5ecd-4fd2-8e80-ca484dbbf42c.sql` — جدول payment_invoices بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260306090749_7083e633-4dd3-4e39-89fb-e56743b19429.sql` — جدول zatca_certificates بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260306090749_7083e633-4dd3-4e39-89fb-e56743b19429.sql` — جدول invoice_chain بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260308080757_507348c1-4acd-4b30-b494-83b4c8654a74.sql` — جدول support_tickets بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260308080757_507348c1-4acd-4b30-b494-83b4c8654a74.sql` — جدول support_ticket_replies بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260314084555_8457acb3-6f3f-4d5c-94c9-c74ed81d6aa5.sql` — جدول annual_report_items بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260314084555_8457acb3-6f3f-4d5c-94c9-c74ed81d6aa5.sql` — جدول annual_report_status بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260315205502_692dbecd-d20f-49a1-bfb2-dfc1928a1aed.sql` — جدول expense_budgets بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260317174526_74a18604-0a9b-4669-93e1-072837f59962.sql` — جدول zatca_operation_log بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260317194414_0c9d3447-60eb-49ad-a5d2-baf1718951bb.sql` — جدول invoice_items بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260318145423_06d3310a-35ad-432c-a486-58c18b4e9d3a.sql` — جدول account_categories بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260327081520_ce2a3de9-1eb5-4c57-959f-6b88198166cb.sql` — جدول ai_chat_sessions بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260426232344_email_infra.sql` — جدول email_send_log بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260426232344_email_infra.sql` — جدول email_send_state بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260426232344_email_infra.sql` — جدول suppressed_emails بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260426232344_email_infra.sql` — جدول email_unsubscribe_tokens بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)
- `supabase/migrations/20260525021959_a882f3c3-1053-47d3-bc0a-c6037d57a5ec.sql` — جدول disbursement_vouchers بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)

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
