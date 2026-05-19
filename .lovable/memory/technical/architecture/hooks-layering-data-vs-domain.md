---
name: hooks-layering-data-vs-domain
description: فصل طبقات الهوكس — hooks/data للاستعلامات الخام، hooks/domain للحسابات، hooks/page للتنسيق
type: preference
---

طبقات الهوكس بعد ريفاكتور التدقيق:

| الطبقة | المسار | الدور |
|---|---|---|
| Data | `src/hooks/data/{module}/` | استعلامات Supabase خام (CRUD/queries/realtime). يستورد `@/integrations/supabase/client`. |
| Domain | `src/hooks/domain/{module}/` | منطق أعمال محسوب (derivations, aggregations). يستورد من `hooks/data` فقط — ممنوع `supabase` مباشرة. |
| Page | `src/hooks/page/{role}/{section}/` | تنسيق صفحة واحدة (state + handlers + استدعاء data/domain hooks). |
| UI | `src/hooks/ui/` | هوكس UI عامة (viewport, debounce, mounted, sort). بدون منطق أعمال. |
| Auth | `src/hooks/auth/` | استثناء — مصادقة وأدوار (يبقى منفصلاً لحساسيته الأمنية). |

**قاعدة استيراد**:
- `page` → يستورد من `data` و `domain` و `ui`.
- `domain` → يستورد من `data` فقط.
- `data` → يستورد من `lib/api` و `integrations/supabase/client`.
- **ممنوع** عكسها (data لا يعرف عن domain، domain لا يعرف عن page).

**حيث ينتمي هوك جديد**:
- يحتوي `supabase.from(...)` أو `supabase.rpc(...)`؟ → `hooks/data/`.
- يجمع نتائج هوكس data ويحسب عليها؟ → `hooks/domain/`.
- يربط حالة UI صفحة واحدة؟ → `hooks/page/`.

**خلفية**: قبل التدقيق كان `hooks/financial/` و `hooks/data/financial/` متوازيين بلا قاعدة واضحة. تم نقل `hooks/financial/` إلى `hooks/domain/financial/` (11 موقع استيراد محدَّث) لرفع الالتباس.
