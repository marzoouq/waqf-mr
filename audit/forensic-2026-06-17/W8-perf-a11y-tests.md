# W8 — Perf/A11y/PWA/SEO/Tests (الفحص الجنائي الثاني — 2026-06-17)

25 findings.

## 🔴 CRITICAL
1. **#1** 3 ملفات اختبار فاشلة — `useSupportAnalytics` mock غير محلول، `usePropertyChecklist`، اختبار DB.
2. **#2** **صفر مسارات lazy** — كل الصفحات eager import → bundle مضخّم.
3. **#3** لا `<main>` landmark في `DashboardLayout` → فقدان accessibility skip-to-content.

## 🟠 HIGH
- #4 20 موضع `ml-*` في تطبيق RTL → استبدال بـ `me-*/ms-*`.
- #5 PWA icon `purpose="any maskable"` خطأ — يجب فصل entries.
- #6 لا `tailwindcss-rtl` plugin؛ animation slide-right تستخدم translateX غير اتجاهي.
- #7 أزرار icon-only تستخدم `title=` بدل `aria-label`.
- #8 9 صور بلا `loading="lazy"` ولا width/height.

## 🟡 MEDIUM
- #9 138 `useQuery` بلا `staleTime` صريح.
- #10/#11 og:url ثابت في index.html + meta OG مكرّرة.
- #12 manifest ينقصه `screenshots` و`categories`.
- #13 اختبارات DistributeDialog/CloseYearDialog سطحية بلا assertions على payload الـ RPC.
- #14 coverage threshold 60% (منخفض لنظام مالي).
- #15 QR `<img>` بلا aspect-ratio → CLS.

## 🔵 LOW
#16 لا React.memo على جداول كبيرة، #17 robots.txt مكرر، #18 sitemap قديم، #19 splash alt، #20 Amiri PDF غير مؤكّد، #21/#22 console leaks، #23 PWA register silent catch، #24 frame-buster مكرر مع CSP، #25 test env act/QueryClient.
