## الهدف
التحقق البصري من أن `PageHeaderCard` بعد إصلاح الخط لا يتراكب مع العنوان على الجوال في 4 صفحات: dashboard، accounts، beneficiaries، audit-log.

## الخطوات

### سكربت Playwright واحد
`/tmp/browser/admin-verify/verify_all_headers.py` يقوم بـ:

1. تشغيل متصفح بحجم جوال (411×738، dpr=2.625)
2. حقن جلسة Supabase من env
3. لكل مسار من `["/", "/accounts", "/beneficiaries", "/audit-log"]`:
   - `page.goto` + انتظار `networkidle` + 1500ms
   - تحديد h1 داخل بطاقة الهيدر (`Array.from(document.querySelectorAll('h1')).find(h => h.closest('.rounded-2xl'))`)
   - قراءة: النص، `getComputedStyle` (fontFamily/fontSize)، `getBoundingClientRect`
   - قراءة موقع أيقونة البطاقة (`div.gradient-gold` الشقيقة)
   - التحقق برمجياً: هل `h1.right > icon.left` أو تتقاطع الصناديق؟
   - أخذ element screenshot للبطاقة → `SC/mobile_<name>.png`
4. طباعة جدول نتائج مع علامة PASS/FAIL لكل صفحة

### معايير النجاح
- fontFamily = Tajawal (ليس Amiri)
- ارتفاع صندوق h1 ≤ 30px
- عدم تقاطع صندوقي h1 والأيقونة أفقياً في RTL
- لقطات البطاقات تُراجَع بصرياً عبر `code--view`

### المخرجات
- تقرير موجز في الرد النهائي مع جدول 4 صفحات وحالة كل صفحة
- 4 لقطات في `/tmp/browser/admin-verify/screenshots/mobile_*.png`

### الملفات
لن يُعدَّل أي ملف مشروع. سكربت مؤقت فقط في `/tmp/`.
