# تقرير فحص جنائي بعد تطبيق مسار A — اكتشاف ارتداد في اختبارات `numericalAudit`

## 1. الحالة الحالية

| المؤشر | القيمة | الحكم |
|---|---|---|
| `vitest run` | **8 فشل / 2113 نجاح** (من 2121) | ❌ ارتداد |
| `audit:gate` | 9/9 ✅ | سليم |
| Edge `dashboard-summary` (preview) | يستجيب في ~3.2s | سليم وظيفياً (بطء طبيعي لأول boot) |
| Migration REVOKE | مطبَّق ✅ | الـ5 RPC أصبحت محصورة على service_role |
| Linter | 1 ERROR + 36 WARN (نفس الموجود قبل التغيير) | غير مرتبط بمسار A |

## 2. الجذر الجنائي — لماذا فشلت 7 اختبارات في `numericalAudit.test.ts`؟

سلسلة السبب → النتيجة:

1. تعديل سابق (مسار A): `diagnosticsReadService.getDashboardFullSummary` تحوّل من `rpc('get_dashboard_full_summary', …)` إلى `invoke('dashboard-summary', …)` (السطور 211–222 من `src/lib/services/diagnosticsReadService.ts`).
2. ملف الاختبار `src/lib/diagnostics/checks/numericalAudit.test.ts` يُحاكي `@/integrations/supabase/client` فقط (السطور 28–76) — يَعترِض `supabase.rpc(...)` وليس `invoke(...)`.
3. بعد التحوّل، `getDashboardFullSummary` يستدعي `invoke` الحقيقية → تفشل في بيئة الاختبار (لا شبكة، لا session) → الـtry/catch يُعيد `null`.
4. كل اختبار يتلقى `rpc=null` → الكود يُرجع `status: 'warn'` ("RPC غير متاحة") → الاختبار يتوقع `'pass'`/`'fail'` → فشل (7 من 11).

التحقق: الـ4 اختبارات الناجحة في نفس الملف (`returns info when no fiscal year exists`, `returns info when no closed year exists`, و2 من `checkSnapshotIntegrityClosedYear`) لا تعتمد على `getDashboardFullSummary` → تأكيد إضافي على دقّة الجذر.

ارتداد جانبي: اختبار `checkSupabaseConnection` (في `checks.test.ts`) يستغرق 2500ms ويفشل أحياناً عند التشغيل المتوازي مع 244 ملف اختبار آخر بسبب timeout — flaky قديم سابق لمسار A (يمر منفرداً)، لا أتعرّض له هنا.

## 3. الحل الجراحي (تعديل ملف اختبار واحد فقط)

**ملف**: `src/lib/diagnostics/checks/numericalAudit.test.ts`
**نطاق التعديل**: إضافة `vi.mock('@/lib/api/invoke', …)` بجوار الـmock الحالي لـ supabase، يُرجع `state.rpc.data` حين يكون `fnName === 'dashboard-summary'` ملفوفاً في `{ aggregated: … }` (الشكل الذي يتوقعه `getDashboardFullSummary`).

التغيير diff تقريبي:

```ts
// أسفل vi.mock('@/integrations/supabase/client', …)
vi.mock('@/lib/api/invoke', () => ({
  invoke: vi.fn(async (fn: string) => {
    if (fn === 'dashboard-summary') {
      if (state.rpc.error) throw new Error(state.rpc.error.message);
      return { aggregated: state.rpc.data };
    }
    throw new Error(`unmocked invoke: ${fn}`);
  }),
}));
```

لا تغيير على الكود الإنتاجي. لا تغيير على بقية الاختبارات.

## 4. لماذا لا يجب الرجوع عن مسار A بدل تعديل المحاكي

- الـRPC مُغلقة فعلياً على authenticated في DB → أي `supabase.rpc('get_dashboard_full_summary')` من العميل سيرجع `42501 permission denied`. صفحة Diagnostics (admin-only) يجب أن تمرّ عبر Edge موثَّقة الدور.
- الكود الإنتاجي صحيح وموثَّق (`dashboard-summary` Edge يتحقق من admin/accountant)؛ الخطأ في طبقة المحاكاة فقط.

## 5. التحقق بعد التنفيذ

1. `bunx vitest run src/lib/diagnostics/checks/numericalAudit.test.ts` → 11/11 ✅.
2. `bunx vitest run` كاملاً → ≤1 flaky (checkSupabaseConnection) أو 0.
3. لا تأثير على preview أو Edge logs.

## 6. ملاحظات منفصلة (لا تُنفَّذ الآن — موصى بها لاحقاً)

- `checkSupabaseConnection` flaky (2500ms يقترب من حدّ vitest tests parallel) — يستحق `vi.useFakeTimers` أو زيادة timeout صريحة.
- Linter 37 تحذيراً قائماً قبل مسار A — يستحق فحص جنائي منفصل للدوال `SECURITY DEFINER` غير المغطّاة (دوال الإقفال/التوزيع/المستخدمين).
- بطء `dashboard-summary` 3.2s — أول boot للـEdge بعد إعادة النشر؛ يستحق رصد p95 لاحقاً.

## المخرجات

- تعديل ملف اختبار واحد فقط: إضافة `vi.mock('@/lib/api/invoke', …)`.
- لا تعديل إنتاجي.
- لا migration.
