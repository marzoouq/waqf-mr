# خريطة الطبقات — Architecture Map

اتجاه الاعتماد يسير من الأعلى للأسفل فقط. أي سهم معكوس = انتهاك.

```mermaid
graph TD
  MAIN[main.tsx<br/>entry] --> BOOT[app/bootstrap<br/>side-effect modules]
  MAIN --> APP[App.tsx]
  APP --> APR[app/providers]
  APP --> ARO[app/router]
  ARO --> RL[app/root-layout]
  ARO --> RT[routes/**<br/>role route trees]
  RT --> P[Pages<br/>src/pages]
  P --> HP[hooks/page<br/>page controllers]
  P --> HA[hooks/application<br/>cross-role controllers]
  HP --> HD[hooks/data<br/>Supabase queries]
  HP --> HDom[hooks/domain<br/>pure calculations]
  HP --> HU[hooks/ui<br/>UI primitives]
  HA --> HD
  HA --> HDom
  HD --> SB[integrations/supabase/client]
  HD --> LIB[lib<br/>stateful services]
  HDom --> UT[utils<br/>pure functions]
  LIB --> SB
  LIB --> NOTIFY[lib/notify<br/>sonner wrapper]
  P --> C[components<br/>presentational]
  C --> UT
  C --> HU
  SB --> DB[(Lovable Cloud<br/>42 tables + RLS)]
  EF[supabase/functions<br/>Edge Functions] --> DB
```

## قواعد الاتجاه

| من | إلى | مسموح؟ |
|---|---|---|
| `main.tsx` | `app/bootstrap/**` فقط | ✅ (P4) |
| `app/bootstrap/**` | `hooks/**` أو `pages/**` | ❌ (side effects only) |
| `pages/**` | `hooks/page/**` أو `hooks/application/**` | ✅ |
| `pages/**` | `hooks/data/**` | ❌ Critical (CoreModV7) |
| `pages/**` | `@/integrations/supabase/client` | ❌ Critical |
| `components/**` | `hooks/data/**` | ❌ |
| `components/**` | `@/integrations/supabase/client` | ❌ Critical |
| `hooks/data/**` | `sonner` / `@/lib/notify` | ❌ (No Toast in Data Hooks) |
| `hooks/**` | `@/pages/**` | ❌ Critical (HookDirection) |
| `utils/**` | `@/integrations/supabase/client` | ❌ Critical (lib vs utils boundary) |
| `utils/**` | `sonner` | ❌ Critical |
| `utils/**` | `@/hooks/**` | ❌ (يكسر اتجاه الاعتماد) |
| `lib/**` | `@/integrations/supabase/client` | ✅ |
| `index.ts` (barrel) | barrel آخر | ❌ Warning (Barrel Import Rule) |

## بوابة الإنفاذ

- `npm run audit` يُشغّل 5 سكربتات + يولّد `audit/report.html`.
- `npm run audit:gate` (Vitest) يفرض القواعد الحرجة.
- `.husky/pre-push` يمنع الـ push عند فشل أي بوابة.
- `.github/workflows/ci.yml` يطبّق نفس البوابات على كل PR.

راجع `audit/structure-deep-review.md` للحالة التفصيلية.
