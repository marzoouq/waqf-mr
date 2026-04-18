# check-contract-expiry

دالة فحص العقود المنتهية أو القاربة على الانتهاء وإرسال إشعارات للناظر.

## الحالة الحالية
⚠️ **cron job معطَّل** — تم إلغاء الجدولة التلقائية في migration `20260306023216_*.sql`
(الجدولة الأصلية كانت `check-contract-expiry-daily` يومياً).

## الاستدعاء الحالي
- **يدوي**: من لوحة الناظر عند الحاجة
- **عند فتح صفحة العقود**: فحص خفيف على العميل عبر `useContractExpiry`

## إعادة التفعيل (إن لزم)
لإعادة جدولة الفحص اليومي عبر `pg_cron` + `pg_net`:

```sql
SELECT cron.schedule(
  'check-contract-expiry-daily',
  '0 6 * * *',  -- يومياً 6 صباحاً بتوقيت UTC
  $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/check-contract-expiry',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);
```

## بدائل
- `cron_check_contract_expiry()` — دالة SQL تعمل داخل `pg_cron` مباشرة بدون edge function
  (موجودة بالفعل في الـschema، يمكن جدولتها مباشرة)

## الأمان
يتحقق من المستخدم عبر `getUser()` ويفرض دور `admin` قبل التنفيذ اليدوي.
