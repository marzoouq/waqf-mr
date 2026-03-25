
# خطة معالجة نتائج التقارير الأمنية

## ✅ تم تنفيذه

| البند | التاريخ |
|---|---|
| signIn safety timeout (8s) | 25 مارس 2026 |
| PWA manifest purpose split | 25 مارس 2026 |
| ErrorBoundary chunk patterns | 25 مارس 2026 |
| CORS explicit rejection | 25 مارس 2026 |
| ExpenseBudgetBar useMemo merge | 25 مارس 2026 |
| queryClient retry → 2 | 25 مارس 2026 |
| UUID leak fix | 25 مارس 2026 |
| ترقية supabase-js → ^2.100.0 | 25 مارس 2026 |
| ترقية react-query → أحدث patch | 25 مارس 2026 |
| حذف bun.lock من المستودع | 25 مارس 2026 |
| **Pagination للرسائل (useInfiniteQuery)** | **25 مارس 2026** |
| **تنظيف 37 تعليق إصلاح قديم (BUG-xx/INT-xx) من 13 ملف** | **25 مارس 2026** |

## ⚠️ Tailwind v4 — تم التراجع

محاولة الترقية لـ v4 فشلت وتم التراجع الكامل لـ v3.4.17. المشروع مستقر على v3.

## ⏸️ مؤجل

| البند | السبب |
|---|---|
| React 19.2 | الإصدار غير موجود حالياً — آخر مستقر 19.1 |
| QR مكتبتان | يحتاج تحليل أين تُستخدم كل واحدة |
| sourcemap: 'hidden' | يحتاج تكامل مع خدمة error tracking |
| localStorage prefix | تغيير بنيوي يحتاج اختبار شامل |

## ❌ مرفوض

| البند | السبب |
|---|---|
| .env خطر أمني | الملف يُدار تلقائياً — مفاتيح عامة فقط |
| تدوير مفاتيح Supabase | غير مطلوب — anon key عام |
| git filter-repo | لا أسرار حقيقية في التاريخ |
