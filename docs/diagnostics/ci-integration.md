# دمج CI (مستقبلًا)

التشغيل الحالي للفحوصات يدوي عبر `/dashboard/diagnostics` أو يستهلكها مطوّر من خلال:

```ts
import { runAllDiagnostics } from '@/lib/diagnostics/checks';

const results = await runAllDiagnostics({
  onProgress: ({ done, total, current }) => {
    console.log(`${done}/${total} — ${current}`);
  },
});
```

## خطة CI مقترحة

1. **Pre-deploy job**: تشغيل `runAllDiagnostics` على staging مع service account له role admin.
2. **Threshold**: فشل النشر إذا `failures > 0` أو `warnings > 5`.
3. **تقرير**: حفظ JSON كـ artifact للمراجعة.

## القيود الحالية

- الفحوصات تعتمد على `window` و `performance` — تحتاج jsdom كاملًا أو متصفح headless.
- بعض الفحوصات تتطلب جلسة مصادقة فعلية.
- ليس مفعّلًا حالياً.
