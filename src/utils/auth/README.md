# src/utils/auth/

دوال **نقية** متعلقة بالمصادقة — تحقق صيغ، parsing، formatting بدون أي I/O.

## القاعدة

- لا تستورد `@/integrations/supabase/client`.
- لا تستورد `sonner` ولا `@/lib/notify`.
- لا تحتفظ بحالة، لا event listeners، لا timers.
- مدخل ثابت ⇒ مخرج ثابت.

## مقابل `src/lib/auth/`

| السمة | `utils/auth/` | `lib/auth/` |
|---|---|---|
| مكالمات Supabase | ❌ | ✅ |
| toast / notify | ❌ | ✅ |
| singletons / state | ❌ | ✅ |
| الاستعمال | hooks/data، hooks/page، components | AuthContext، Edge wrappers |

أي كود يحتاج Supabase أو حالة ⇒ ضعه في `lib/auth/`.

راجع `src/utils/README.md` و `src/lib/README.md` للقاعدة الكاملة.
