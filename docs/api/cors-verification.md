# CORS Verification Matrix

> آخر تحقق ميداني: 2026-05-11 (Version C)
> الأداة: `curl -X OPTIONS -H "Origin: ..." -H "Access-Control-Request-Method: POST"`
> المرجع: `supabase/functions/_shared/cors.ts`

## نطاق التحقق

- **Origins مختبرة (4):**
  - `https://waqf-wise.net` (production)
  - `https://www.waqf-wise.net` (production www)
  - `https://id-preview--29470216-3df1-468f-b021-5c98b75b2920.lovable.app` (preview)
  - `https://malicious.example.com` (origin غير مسموح — يجب الرفض)
- **Functions تمثيلية (3):** `dashboard-summary` (auth)، `lookup-national-id` (anon)، `process-email-queue` (cron + verify_jwt=true)

## النتائج

| Function | waqf-wise.net | www.waqf-wise.net | preview lovable.app | malicious.example.com |
|---|:-:|:-:|:-:|:-:|
| `dashboard-summary` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |
| `lookup-national-id` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |
| `process-email-queue` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |

## التفسير

- **"مرآة"**: قيمة `Access-Control-Allow-Origin` المُعادة تطابق header `Origin` الوارد → المتصفح يقبل.
- **"فارغ"**: `Access-Control-Allow-Origin: ""` → المتصفح يرفض الطلب (السلوك الآمن المتوقع). الردّ نفسه HTTP 200 على preflight لكن CORS يفشل عند المتصفح.
- **`Vary: Origin`**: حاضر في كل استجابة preflight → يمنع الـ CDN من cache origin خاطئ.
- **No-origin (server-to-server)**: عند غياب header `Origin` كلياً (pg_cron / pg_net / Auth Hooks)، يُعاد origin افتراضي مسموح — راجع `getAllowedOrigin()` في `_shared/cors.ts`.

## كيفية إعادة التشغيل

```bash
for ORIGIN in \
  "https://waqf-wise.net" \
  "https://www.waqf-wise.net" \
  "https://id-preview--29470216-3df1-468f-b021-5c98b75b2920.lovable.app" \
  "https://malicious.example.com"; do
  for FN in dashboard-summary lookup-national-id process-email-queue; do
    echo "=== $FN ← $ORIGIN ==="
    curl -s -o /dev/null -D - -X OPTIONS \
      "https://nuzdeamtujezrsxbvpfi.supabase.co/functions/v1/$FN" \
      -H "Origin: $ORIGIN" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: authorization,content-type,apikey" \
      | grep -iE "access-control-allow-origin|vary"
  done
done
```

أعِد التشغيل بعد أي تعديل على `_shared/cors.ts` أو `ALLOWED_ORIGINS`/`ALLOWED_ORIGIN_PATTERNS`.
