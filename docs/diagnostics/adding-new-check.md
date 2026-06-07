# إضافة فحص جديد

## الخطوات

1. أنشئ دالة في الملف المناسب تحت `src/lib/diagnostics/checks/<category>.ts`:

```ts
import type { CheckResult } from '../types';

export async function checkMyNewThing(): Promise<CheckResult> {
  const id = 'category_my_new_thing';
  try {
    // ... منطق الفحص (لا writes)
    return { id, label: 'اسم الفحص', status: 'pass', detail: 'تفاصيل قصيرة' };
  } catch (e) {
    return { id, label: 'اسم الفحص', status: 'fail', detail: String(e) };
  }
}
```

2. أضفه إلى `src/lib/diagnostics/checks.ts`:
   - export في القسم العلوي
   - import في قسم البناء
   - أضفه إلى `diagnosticCategories[].checks`

3. اكتب اختبار في `*.test.ts` بجانب الفحص:

```ts
import { describe, it, expect } from 'vitest';
import { checkMyNewThing } from './<category>';

describe('checkMyNewThing', () => {
  it('returns pass when ...', async () => {
    const r = await checkMyNewThing();
    expect(r.status).toBe('pass');
  });
});
```

## القواعد

- **read-only فقط** — لا writes، لا migrations، لا توست.
- يجب أن يُعيد دائماً (try/catch شامل).
- detail قصير (<200 حرف) ويُسانتز عبر `sanitizeDiagnosticOutput`.
- لا تستخدم `console.*` — استخدم `logger`.
- نص عربي RTL.
