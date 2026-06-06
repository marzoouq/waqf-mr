# `src/app/bootstrap/` — Boot Sequence

Side-effect modules executed once by `src/main.tsx` during application startup.
Each module is small, focused, and safe to import independently for testing.

## Modules

- `removeSplash.ts` — يزيل شاشة البداية بأمان بعد render.
- `preconnectBackend.ts` — يضيف `<link rel="preconnect">` لـ Supabase URL لتقليل زمن أول طلب.
- `registerPwa.ts` — يستدعي `runPwaCacheGuard` بنمط fire-and-forget.
- `initMonitoring.ts` — يُؤجّل تهيئة Web Vitals + page-load metrics إلى وقت الخمول.
- `mountReact.ts` — يُركّب `<App />` داخل `#root` مع fallback آمن عند الفشل.

## Boundary

- `bootstrap/**` = side effects + DOM bootstrap فقط. لا منطق أعمال ولا data fetching.
- `main.tsx` = منسّق فقط — يستورد الوحدات بترتيب الإقلاع ولا يحتوي منطقاً.
- اتجاه الاعتماد: `main.tsx → app/bootstrap/** → lib/**`.
