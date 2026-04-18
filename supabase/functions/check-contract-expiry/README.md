# check-contract-expiry

دالة فحص العقود المنتهية أو القاربة على الانتهاء وإرسال إشعارات للناظر.

## الحالة الحالية
✅ **مُجدوَل يومياً عبر `pg_cron`** — يُنفَّذ الساعة 6:00 UTC (9:00 صباحاً بتوقيت السعودية)
عبر استدعاء دالة SQL داخلية `public.cron_check_contract_expiry()` مباشرةً
(بدون الحاجة لاستدعاء edge function — أبسط وأكثر أماناً).

اسم الـjob: `check-contract-expiry-daily`

## الاستدعاءات
- **تلقائي يومي**: عبر `pg_cron` → `cron_check_contract_expiry()` SQL function
- **يدوي**: من لوحة الناظر عبر استدعاء هذه الـedge function عند الحاجة
- **عند فتح صفحة العقود**: فحص خفيف على العميل عبر `useContractExpiry`

## التحقق من الجدولة
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'check-contract-expiry-daily';
```

## إيقاف الجدولة (إن لزم)
```sql
SELECT cron.unschedule('check-contract-expiry-daily');
```

## بديل: استخدام edge function بدلاً من SQL function
لو أُريد لاحقاً استبدال SQL function بـedge function:
```sql
SELECT cron.schedule(
  'check-contract-expiry-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/check-contract-expiry',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);
```

## الأمان
- **الجدولة التلقائية**: تعمل بصلاحيات `pg_cron` (postgres role) — تتجاوز RLS بأمان
- **الاستدعاء اليدوي**: يتحقق من المستخدم عبر `getUser()` ويفرض دور `admin`
