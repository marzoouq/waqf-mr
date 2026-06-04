# خطة إكمال الجولات المتبقية (B + C)

## Round B — Zod Validation لـ Edge Functions (P1)

### B1. `lookup-national-id`
- إضافة `z.object({ national_id: z.string().regex(/^[12]\d{9}$/) })`
- `safeParse` + رد 400 موحّد عند الفشل
- الحفاظ على CORS headers في كل الردود

### B2. `admin-manage-users`
- إنشاء `supabase/functions/admin-manage-users/validators.ts` يحتوي على schema لكل من 10 actions:
  - `list_users`, `create_user`, `update_user`, `delete_user`, `assign_role`, `remove_role`, `reset_password`, `disable_user`, `enable_user`, `get_user`
- `discriminatedUnion('action', [...])` للتمييز بين العمليات
- استدعاء `safeParse` في `index.ts` قبل تنفيذ أي action

### B3. `generate-invoice-pdf`
- إضافة `z.object({ invoice_id: z.string().uuid() })`
- `safeParse` + 400

### نشر وفحص
- `supabase--deploy_edge_functions` للوظائف الثلاث
- `supabase--test_edge_functions` (إن وُجدت اختبارات)
- فحص logs بعد النشر

---

## Round C — أداء واستقرار Realtime (P2)

### C1. تحليل الاستعلامات البطيئة
- `EXPLAIN ANALYZE` لـ:
  - `SELECT * FROM properties WHERE fiscal_year_id = $1`
  - `SELECT * FROM expenses WHERE fiscal_year_id = $1`
  - `SELECT * FROM invoices WHERE fiscal_year_id = $1`
- إذا كانت Seq Scan → اقتراح migration بإضافة فهارس:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_expenses_fiscal_year ON public.expenses(fiscal_year_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_year ON public.invoices(fiscal_year_id);
  CREATE INDEX IF NOT EXISTS idx_properties_fiscal_year ON public.properties(fiscal_year_id);
  ```
- مراجعة `invoke:dashboard-summary` (4.6s) في `supabase/functions/` لتقليل عدد الاستعلامات

### C2. إصلاح `bfcacheSafeChannel` على `TOKEN_REFRESHED`
- ملف: `src/lib/realtime/bfcacheSafeChannel.ts` (أو ما يكافئه)
- المشكلة: `CHANNEL_ERROR` على `fiscal-years-global` و `notifications-{userId}` بعد تجديد التوكن
- الحل: إعادة الاشتراك تلقائياً عند `onAuthStateChange('TOKEN_REFRESHED')` مع backoff
- اختبار يدوي عبر preview بعد التطبيق

---

## التحقق النهائي (إلزامي قبل الإنهاء)
- `bunx vitest run` — 1936/1936 ✓
- `supabase--linter` — لا warnings جديدة
- فحص `edge_function_logs` للوظائف المُحدّثة (لا 500)
- network tab بعد C1 — تأكد من تحسّن زمن الاستعلامات

---

## مستثنى من هذه الخطة (يحتاج جولات منفصلة)
- `auth-email-hook` Zod (P3 — webhook موقّع داخلياً)
- ملفات backward-compat الصغيرة (تحتاج `knip` محلياً)
- توحيد `ConfirmDialog` (تجميلي)
- تقسيم الملفات > 200 سطر