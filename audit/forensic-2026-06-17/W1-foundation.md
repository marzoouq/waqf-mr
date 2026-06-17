# W1 — Foundation & Bootstrap (الفحص الجنائي الثاني — 2026-06-17)

18 finding عبر فئات (a)–(i). البنود الحرجة:
- **High:** race في `removeSplash()` (main.tsx:25), race مزدوج في `useAuthListener` (131–148)، client بدون حارس env (client.ts:5)، غياب ErrorBoundary حول `<Outlet/>` (root-layout.tsx:48)
- **Med:** ترتيب `FiscalYearProvider` قبل auth-ready، `preconnect` بلا crossorigin، preload خطوط بأسماء غير مضمونة، manifest يخلط purpose any+maskable، اختلاف `background_color` بين static و Vite manifest، غياب HSTS و CSP حقيقي، inline frame-buster غير ضروري
- **Low:** `idle` 1500ms طويل، `og:url` ثابت، SW registration بلا fallback

التقرير الكامل بالجدول في الرد السابق محفوظ هنا للرجوع.
