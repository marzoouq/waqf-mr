# خطة الفحص الهجين الجنائي العميق قبل النشر

الهدف: تشخيص شامل ومباشر للتطبيق (ستاتيكي + ديناميكي + قاعدة بيانات + أمن + أداء) وإخراج تقرير موحّد بالمشاكل والتوصيات ذات الأولوية، دون أي تعديل على الكود قبل موافقتك.

## نطاق الفحص (7 محاور)

### 1) الفحص الستاتيكي والمعماري
- تشغيل `npm run audit` (السلسلة الكاملة: structure, conventions-deep, hooks-layout, ui-permissions, page-controls) + قراءة `audit/report.html`.
- تشغيل `tsgo` (TypeScript) و ESLint لالتقاط الأخطاء والتحذيرات الحديثة.
- تدقيق حدود الطبقات: pages → hooks/page → hooks/data، ومنع `supabase` خام في pages/components، و`sonner` في utils/hooks/data.
- تدقيق قاعدة Barrel Imports و lib vs utils.

### 2) الفحص الأمني (Backend + Frontend)
- `supabase--linter` (development): RLS، السياسات، الأعمدة الحساسة، أذونات public.
- `security--run_security_scan` + مراجعة `security--get_scan_results` المُخزّنة.
- مراجعة كل Edge Function: وجود `getUser()`, Zod validation, CORS, عدم استخدام `getSession()` أو `SERVICE_ROLE_KEY` كبديل مصادقة.
- التحقق من `user_roles` (لا أدوار على profiles/localStorage) وسلامة `has_role()`.
- تدقيق تشفير AES-256 للأعمدة الحساسة (pgcrypto).

### 3) اختبارات الوحدة والتكامل
- `bunx vitest run` كامل السويت (المتوقع ~2176 اختبار) + رصد الفشل/التذبذب.
- تشغيل `npm run audit:gate` (بوابة Vitest الحرجة).
- مراجعة تغطية اختبارات المسارات الحساسة: توزيع، إقفال سنة مالية، ZATCA ICV، advances.

### 4) الفحص الديناميكي عبر Playwright
- تشغيل التطبيق على `localhost:8080` مع حقن جلسة Supabase الموجودة.
- محاكاة 4 أدوار (admin / accountant / beneficiary / waqif) والتنقل عبر المسارات الرئيسية في `ROUTE_ROLES` (43 مساراً).
- التقاط: console errors, network 4xx/5xx, runtime errors, أزمنة التحميل.
- التحقق من: RTL، تحميل الخطوط (Tajawal/Amiri)، توفر الأزرار الرئيسية، عمل النماذج الحرجة (عقد، فاتورة، توزيع).

### 5) فحص قاعدة البيانات والأداء
- `supabase--slow_queries` (top 20) لرصد الاستعلامات البطيئة.
- `supabase--db_health` للتحقق من الاتصالات والفهارس.
- مراجعة `runtime-errors` و`edge-function-logs` لأي أخطاء إنتاجية حديثة.
- فحص pagination وحدود 500/2000 سجل.

### 6) فحص السلامة المالية (Financial Integrity)
- تشغيل diagnostics التطبيق الداخلية: `financial`, `cardConsistency`, `numericalAudit`, `zatca` عبر `runByIds`.
- التحقق من: (i) `available_amount` غير سالب، (ii) توزيعات ≤ متاح، (iii) صيغة حصة المستفيد، (iv) advances ضمن الحصة، (v) LRM parity، (vi) ICV chain integrity، (vii) لا فواتير بلا سلسلة.

### 7) فحص PWA / SEO / A11y / Bundle
- `manifest.webmanifest`, Service Worker registration, دفع الإشعارات.
- الميتاداتا في `index.html` (title, description, og:*, twitter:*).
- تدقيق a11y سريع: ألوان التباين (tokens)، أسماء الأزرار الأيقونية، عنصر `<main>` واحد لكل صفحة.
- حجم الحزمة عبر Vite build report (إن توفّر).

## المخرجات

سأقدّم في نهاية الفحص تقريراً منظّماً يحتوي:

1. **ملخص تنفيذي**: عدد المشاكل مصنّفة (Critical / High / Medium / Low / Info).
2. **جدول المشاكل**: `[الأولوية | المحور | الملف/المسار | الوصف | التوصية | الجهد المقدَّر]`.
3. **قسم Backend/RLS/Edge**: أي ثغرات أمنية أو مخاطر بيانات.
4. **قسم الأداء**: الاستعلامات البطيئة + توصيات فهارس.
5. **قسم مالي**: أي انحرافات في LRM / ICV / carryforward.
6. **قسم UX/A11y/PWA**.
7. **قائمة "لا تنشر حتى تُحلّ"**: البنود التي تمنع النشر.
8. **خارطة إصلاح مقترحة** موزّعة على موجات (P0 قبل النشر، P1 بعد النشر، P2 تحسينات).

## ما لن أفعله في هذه الخطة
- **لا تعديل كود** ولا migrations ولا مسح findings.
- **لا نشر** — التقرير أولاً ثم قرارك.
- **لا اقتراحات تجميلية** خارج نطاق ما يُرصد فعلياً.

## بعد موافقتك
سأُشغّل الفحوصات بالتوازي حيثما أمكن (audit + linter + tests + Playwright)، ثم أُجمّع النتائج في تقرير واحد أعرضه هنا مباشرة قبل أي تنفيذ.
