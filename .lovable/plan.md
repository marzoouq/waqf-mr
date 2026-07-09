# خطة: فحص أداء جنائي شامل — تقرير Markdown فقط (نهائي)

**المخرج:** `audit/performance-forensic-2026-07-09.md` — بدون تعديل كود إنتاج.

كل رقم أدناه تم التحقق منه بأمر `rg`/`bun run build`/`supabase--slow_queries` قبل كتابة الخطة.

---

## 1. الأرقام المُتحقَّق منها

| المؤشر | القيمة | مصدر |
|---|---|---|
| Hooks بلا `staleTime` | **5 / 52** | `rg` على `src/hooks/data/` |
| `supabase` مستورد مباشرة في pages/components | **1** (`src/pages/OAuthConsent.tsx`) | `rg` |
| `console.*` متبقية | **4** | `rg` |
| lazy loading للصفحات | **مُطبَّق كلياً** عبر `lazyWithRetry` | `src/routes/adminRoutes.tsx` |
| أثقل chunk تطبيق | `SystemDiagnosticsPage` 156 kB | build output |
| أكبر vendors | pdf 394، recharts 372، supabase 214، html2canvas 201 | build output |
| مستهلكو `useAppSettings/useSetting` | **34 موقعاً** | `rg` |

## 2. سبب جذري تم اكتشافه (يستحق التقرير)

**`settingsQueryFn` مُشترك بين 3 queryKeys مختلفة** (`all()`, `byCategory()`, `byKey()`) في `src/hooks/data/settings/app/useAppSettingsRead.ts:22-45`. كل استخدام في مكوّن جديد يُنشئ استعلاماً منفصلاً في TanStack ينتهي بـ `SELECT key,value FROM app_settings` كامل — يفسّر **17,527 استدعاء / 29.8s** في `pg_stat_statements`.

## 3. الاستعلامات الساخنة (مؤكَّدة من slow_queries)

1. `app_settings` كامل — 17,527 استدعاء / 29,806ms
2. `payment_invoices` مع LATERAL join مزدوج — 1,016 / 22,872ms / max 146ms
3. `access_log` (event_type + created_at DESC) — 561 / 20,168ms
4. `access_log` per user_id — 4,984 / 17,750ms
5. email queue polling (cron) — 1.26M / 55,551ms (طبيعي، مراجعة تردد فقط)

## 4. هيكل التقرير

```text
audit/performance-forensic-2026-07-09.md   (≤ 700 سطر)
├── 0. ملخص تنفيذي — Top 5 wins
├── 1. Bundle & Code-Splitting
│    ├── جدول أكبر 10 chunks
│    └── مرشحات dynamic import: jspdf, recharts, html2canvas, SystemDiagnostics
├── 2. Query Caching
│    ├── **مشكلة settingsQueryFn المُشترك** — تفصيل + توصية تحويل byCategory/byKey إلى select على نفس الـ queryKey
│    └── 5 hooks بلا staleTime — التوصية لكل واحدة
├── 3. Database Hotspots
│    ├── app_settings — سبب الـ 17K
│    ├── access_log — index مقترح (event_type, created_at DESC)
│    ├── access_log — index (user_id, event_type, created_at DESC)
│    └── payment_invoices — استبدال nested LATERAL بـ view أو select-embed أنظف
├── 4. Re-render Hygiene
│    ├── مسح React.memo/useMemo/useCallback في مكونات hot lists
│    └── مواضع محتملة (جداول كبيرة)
├── 5. Component Architecture
│    ├── `OAuthConsent.tsx` — نقل الاستعلام لـ hooks/data
│    ├── 4 مواقع console.* — استبدال بـ logger
│    └── Contexts (Auth/FiscalYear/Contracts) — فحص prop drilling
├── 6. API & Resilience
│    ├── retry policy: تقييم classifyError coverage
│    └── mutation error UX
├── 7. Assets & Images (تأكيد: لا فجوة — og-image 28K، pwa-icons ≤19K)
└── 8. خارطة إصلاح P0/P1/P2 (بدون تنفيذ)
     ├── P0: توحيد settingsQueryFn (−15s DB) + فهرسا access_log
     ├── P1: dynamic import jspdf/recharts/html2canvas (~1 MB gz)
     └── P2: 5 staleTime + OAuthConsent + console.*
```

## 5. خارج النطاق

لا تعديل كود، لا migrations، لا Playwright (جلسة signed_out)، لا نشر، لا فحص أمني (مغطّى سابقاً).

## 6. معايير القبول

- كل توصية = `file:line` أو query hash + رقم قياس فعلي.
- كل بند P0 مع أثر متوقع + جهد + مخاطر.
- الملف ≤ 700 سطر، عربي RTL.

بعد الموافقة أُنشئ التقرير مباشرة.
