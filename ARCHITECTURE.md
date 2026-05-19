# Architecture — نظام إدارة وقف مرزوق بن علي الثبيتي

> **مصدر الحقيقة الموجز** لهيكلة المشروع. التفاصيل التشغيلية في READMEات الفرعية، والقواعد المُطبَّقة آلياً في `scripts/check-conventions.mjs`.

## الطبقات

```
┌─────────────────────────────────────────────────────────────┐
│  pages/             — UI خالص، logic-less                    │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  hooks/page/        — منطق الصفحة (state, handlers, derived) │
└──────┬───────────┬──────────────┬───────────────────────────┘
       │           │              │
┌──────▼───┐ ┌─────▼────┐ ┌───────▼─────┐
│ hooks/   │ │ hooks/   │ │ hooks/auth/ │
│ domain/  │ │ ui/      │ │             │
│ (calc)   │ │ (toast,  │ │ (session,   │
│          │ │  debounce)│ │  role,     │
│          │ │          │ │  webauthn)  │
└──────┬───┘ └──────────┘ └──────┬──────┘
       │                         │
┌──────▼─────────────────────────▼────────────────────────────┐
│  hooks/data/        — React Query wrappers + invalidation    │
└──────┬───────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────┐
│  lib/services/      — استعلامات Supabase الخام، storage,    │
│                       edge functions, rate limit             │
└──────┬───────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────┐
│  @supabase/supabase-js  (Lovable Cloud backend)              │
└──────────────────────────────────────────────────────────────┘
```

### المسارات الجانبية المسموحة

- `lib/auth/*` — منطق مصادقة منخفض المستوى (`setSession`, `nationalIdLogin`) — boundary مقصود
- `utils/*` — **دوال نقية فقط**. لا `supabase`، لا `sonner`، لا حالة. تُستخدم من أي طبقة.
- `lib/` — أدوات بنية تحتية لا تنتمي لطبقة محدّدة (`logger`, `cn`, `notify`, `queryClient`)

## القواعد المُلزِمة (يفرضها CI)

| القاعدة | الموقع | الإجراء |
|---------|--------|---------|
| `console.*` ممنوع | كل `src/` عدا `lib/logger.ts` | استخدم `logger` |
| `supabase` ممنوع | `pages/`, `components/` | استخدم `hooks/data/` |
| `supabase` خارج boundaries في `lib/` | `lib/` عدا `services/` و`auth/` | انقل إلى service |
| `localStorage` لـ `fiscal_year_id` | الكل | استخدم `sessionStorage` |
| `sonner`/`supabase` في `utils/` | `utils/` | استخدم `lib/notify` أو service |
| ملف > 250 سطر | `pages/`, `components/`, `hooks/` | قسّم |
| تبعية عكسية | `hooks/data/` ← `hooks/page/` | ممنوع |

شغّل: `npm run lint:conventions`

## READMEات تفصيلية

- [`src/lib/README.md`](src/lib/README.md) — حدود lib مقابل utils
- [`src/lib/services/README.md`](src/lib/services/README.md) — كل service وما تفعله
- [`src/hooks/README.md`](src/hooks/README.md) — الطبقات وأنماط page hook
- [`src/hooks/domain/README.md`](src/hooks/domain/README.md) — قواعد طبقة الـ domain
- [`src/utils/README.md`](src/utils/README.md) — قاعدة "النقاء" المطلقة

## ما لا يتغيّر

- `supabase/config.toml`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` — Lovable Cloud يديرها
- جدول `user_roles` هو المصدر الوحيد للأدوار (لا `profiles`, لا `localStorage`)
- `verify_jwt = false` مقصود — المصادقة يدوية في كل Edge Function
