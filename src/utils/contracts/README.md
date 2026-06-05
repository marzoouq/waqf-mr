# src/utils/contracts/

دوال **نقية** خاصة بنماذج العقود — builders للبيانات الأولية، helpers لحالة العقد، تنسيقات.

## القاعدة

- لا تستورد `@/integrations/supabase/client`.
- لا تستورد `sonner` ولا `@/lib/notify`.
- لا تحتفظ بحالة، لا useState، لا useEffect.
- مدخلات/مخرجات قابلة للاختبار بـ Vitest بدون mocks.

## مقابل `src/lib/contracts/`

| السمة | `utils/contracts/` | `lib/contracts/` |
|---|---|---|
| مكالمات Supabase | ❌ | ✅ (مزامنة فواتير) |
| toast / notify | ❌ | ✅ (`notifyInvoicesGenerated` …) |
| استبدال QueryClient | ❌ | ✅ |
| الاستعمال | hooks/page (build payload), tests | hooks/page (after-mutation effects) |

أمثلة هنا: `contractFormBuilders.ts` (buildRenewInitialData, buildEditInitialData, buildContractPayload), `contractStatus.ts`.
أمثلة هناك: `invoiceSync.ts` يستدعي toast بعد طفرة Supabase.

راجع `src/utils/README.md` و `src/lib/README.md`.
