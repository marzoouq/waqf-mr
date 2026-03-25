
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

## ⏸️ مؤجل

| البند | السبب |
|---|---|
| Tailwind v4 | تغيير بنيوي كبير — يحتاج إعادة كتابة tailwind.config.ts |
| React 19.2 | يحتاج اختبار شامل قبل الترقية |
| QR مكتبتان | يحتاج تحليل أين تُستخدم كل واحدة |
| sourcemap: 'hidden' | يحتاج تكامل مع خدمة error tracking |
| localStorage prefix | تغيير بنيوي يحتاج اختبار شامل |

## ❌ مرفوض

| البند | السبب |
|---|---|
| .env خطر أمني | الملف يُدار تلقائياً — مفاتيح عامة فقط |
| تدوير مفاتيح Supabase | غير مطلوب — anon key عام |
| git filter-repo | لا أسرار حقيقية في التاريخ |
