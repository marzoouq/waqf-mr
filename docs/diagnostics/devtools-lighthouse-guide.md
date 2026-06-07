# دليل فحص الأداء — DevTools و Lighthouse

## ما قبل الفحص

1. **Hard Reload**: `Ctrl+Shift+R` (Win) / `Cmd+Shift+R` (Mac).
2. **Clear Site Data**: DevTools → Application → Clear storage → Clear site data.
3. **Incognito**: شغّل الفحص في نافذة خاصة لتجنب الإضافات.
4. **عطّل الإضافات**: خصوصاً مانعات الإعلانات و password managers.

## استخدام `?audit=1`

أضف `?audit=1` لأي رابط لتفعيل وضع التدقيق:

```
https://waqf-wise.net/?audit=1
https://waqf-wise.net/dashboard?audit=1
```

ماذا يفعل تلقائياً:
- يُعطّل تسجيل Service Worker (يمنع loops التحديث أثناء الفحص).
- يُعطّل قنوات Realtime على `app_settings` وغيرها.
- يرفع `staleTime` في React Query من 5 دقائق إلى 60 دقيقة.
- يوقف الـ polling الدوري لـ `get_public_stats` و `app_settings`.
- يُظهر Overlay التشخيص أسفل اليسار.

نتيجة هذه الإجراءات: المتصفح يصل بسرعة إلى `networkidle`، فلا يتجمّد Lighthouse.

## تشغيل Lighthouse

### الإعدادات الموصى بها

| الإعداد | القيمة |
|---------|--------|
| URL | `https://waqf-wise.net/?audit=1` |
| Mode | **Navigation** (أو Snapshot للفحوصات السريعة) |
| Device | **Mobile** (لمحاكاة 4G) |
| Categories | Performance + Best Practices + SEO + Accessibility |

### خطوات سريعة

1. افتح DevTools → تبويب **Lighthouse**.
2. ضع الرابط مع `?audit=1`.
3. اختر Navigation + Mobile.
4. اضغط **Analyze page load**.

### لو تجمّد Lighthouse

- تأكد أن الرابط يحتوي `?audit=1` فعلاً.
- افحص **Overlay** في الأسفل — يجب أن تكون كل البطاقات خضراء.
- لو ما زال يتجمّد، شغّل **Timespan** بدلاً من Navigation لتسجيل تفاعل مدته 10 ثوانٍ فقط.

## DevTools متقدّم

### Sources

- **تجنّب فتح `vendor-pdf*.js`** — يحتوي base64 للخطوط العربية (~1MB). فتحه يجمّد الـ DevTools نفسها.
- استخدم `Ctrl+P` للبحث عن ملف بدلاً من تصفح الشجرة.

### Performance

- سجّل مع `?audit=1` لتفادي ضوضاء الـ refetch.
- ركّز على **Long Tasks** (>50ms) في الـ Main thread.
- استخدم **Bottom-Up** view لتحديد أبطأ الدوال.

### Coverage

- DevTools → ⋮ → More tools → **Coverage**.
- ابدأ التسجيل، تصفح الصفحات، اضغط Stop.
- يُظهر JS/CSS غير المستخدم — مرشحون لـ code splitting.

### Application → Service Workers

- على **preview** أو **localhost**: يجب ألا يكون هناك SW مسجَّل.
- على **production**: يجب أن ترى `/sw.js` فقط.
- لو ظهر SW قديم: اضغط **Unregister** ثم Hard Reload.

### Network

- فلتر `app_settings` و `get_public_stats` للتأكد من توقفهما في وضع التدقيق.
- لو ظهرت طلبات متكررة كل 15-25 ثانية → الـ polling لم يتوقف، راجع `queryClient.ts`.

## متى تستخدم `/dashboard/diagnostics` بدلاً من DevTools

- DevTools: لفحص أداء الصفحة، LCP، CLS، Long Tasks، Memory.
- `/dashboard/diagnostics`: لفحص سلامة البيانات، RLS، فواتير ZATCA، اتساق المحاسبة، وأي شيء يحتاج Supabase queries حقيقية.
