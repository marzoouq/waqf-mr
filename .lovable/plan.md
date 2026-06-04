## فحص ثلاثي عميق للتطبيق (قراءة فقط — لا تعديلات)

### المرحلة 1 — Edge Functions (11 دالة)

سحب سجلات آخر 24 ساعة لكل Edge Function وفلترة 5xx/timeout/exception:

- `health-check`, `guard-signup`, `send-verification-email`, `webauthn-register`, `webauthn-authenticate`
- `generate-pdf`, `zatca-report-invoice`, `zatca-renew-csid`, `zatca-onboard`
- `ai-assistant`, `email-unsubscribe`
- (أي دوال أخرى في `supabase/functions/`)

أولاً أحصي الدوال الفعلية من `supabase/functions/` ثم أستدعي `supabase--edge_function_logs` لكل دالة بحثاً عن `error|500|timeout|exception|panic`.

### المرحلة 2 — مصفوفة التحقق الخماسية

تشغيل بالترتيب وجمع النتائج:

1. `bunx vitest run` (كامل، ليس مجموعة جزئية)
2. `node scripts/audit-ui-permissions.mjs` → يجب 0 GAPs
3. `node scripts/build-permissions-matrix.mjs` → يجب 156 صف
4. `bun run lint` إن وُجد script
5. تحقق سريع من حالة Cloud عبر `supabase--cloud_status`

تجميع تقرير "نجح/فشل/تحذيرات" لكل بند.

### المرحلة 3 — فحص متصفح يدوي على صفحات حرجة

عبر `browser--navigate_to_sandbox` ثم تنقل بدون أي إجراءات تعديل (لا حفظ، لا حذف، لا إقفال). فقط:

1. `/dashboard` — تحميل بدون أخطاء console
2. `/dashboard/expenses` (الصفحة الحالية) — فتح نموذج إضافة مصروف ثم إلغاء
3. `/dashboard/contracts` — قائمة العقود تُحمَّل
4. `/dashboard/distributions` — صفحة التوزيع تُحمَّل
5. `/dashboard/fiscal-years` — قائمة السنوات وزر "إقفال" يظهر للناظر فقط (لا ضغط)
6. `/beneficiary/dashboard` (إن أمكن التبديل) — تحميل واجهة المستفيد

لكل صفحة: جمع console errors + network 4xx/5xx + لقطة شاشة عند ظهور أي خلل بصري.

### المخرجات النهائية

تقرير موحّد في رسالة واحدة:
- ✅ ما يعمل بشكل سليم
- ⚠️ تحذيرات (موثّقة/معروفة)
- 🔴 مشاكل فعلية تستدعي إصلاحاً (مع ملف+سطر+سبب)

### حدود واضحة

- لا تعديلات على أي ملف.
- لا migrations.
- لا أي حركة تكتب في DB (لا حفظ نماذج، لا حذف، لا إقفال).
- إن وُجدت مشاكل، تُذكر فقط في التقرير ولا تُصلح في نفس الجولة — تُترك لقرارك في جولة بناء منفصلة.