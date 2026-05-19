
# خطة الفحص الجنائي الشامل (E2E Regression Audit)

## الهدف
التحقق من أن تغييرات مفاتيح الكاش الأخيرة (`beneficiaries-safe` بدل `beneficiaries`) لم تسرّب PII ولم تكسر عرض أي تبويب في لوحتي الناظر والمستفيد، مع تشخيص جنائي للأقسام الفرعية.

## نطاق الفحص

### 1) خط الدفاع الأول — تدقيق ساكن (Static Audit)
- مسح كامل `src/` بـ `rg` للبحث عن:
  - `from('beneficiaries')` المباشر خارج `hooks/data/beneficiaries/*` و`page/admin/*` (يجب أن يكون صفراً خارج CRUD الإداري)
  - استخدامات `queryKey: ['beneficiaries'...]` للتأكد من عدم وجود تصادمات متبقية
  - `invalidateQueries({ queryKey: ['beneficiaries'] })` — التحقق أنها تُبطل ما يُقصد إبطاله فقط
  - استخدام `national_id`, `phone`, `email`, `bank_account` في المكونات/الصفحات (يجب أن تأتي من `beneficiaries` الكامل فقط لـ admin/accountant، ومن `beneficiaries_safe` لكل ما عداهم)
- التحقق من `usePrefetchPages`, `useNotificationBeneficiaries`, `useBulkMessaging` بعد الإصلاحات
- مسح `src/pages` للتأكد من عدم وجود `supabase.from` مباشر (Core Modularization v7)

### 2) خط الدفاع الثاني — تدقيق RLS وContract Tests
- تشغيل مجموعة الاختبارات الحالية كاملةً:
  - `incomeExpensesHookPathsContract`
  - `incomeExpensesCrudReflection`
  - `beneficiaryIsolation`, `adminSectionsVisibility`, `bylawsRlsVisibility`
  - `dashboardRoutesContract`, `pageHookBindingContract`
  - `permissionsParity`, `protectedSectionsWriteGuard`, `sectionsVisibilityProtection`
  - `surfaceComponentIsolation`, `navLinksFiltering`, `invoiceSourceFilter`
- إضافة اختبار جديد (إن لزم) للتحقق من **عدم وجود استعلام مباشر على `beneficiaries` في hooks/data/notifications|messaging**

### 3) خط الدفاع الثالث — فحص حي بالمتصفح (E2E)
بدخول دورين بشكل متعاقب عبر `browser--navigate_to_sandbox`:

**أ) لوحة الناظر (admin):**
- `/dashboard` — التحقق من KPIs (`adminShare`/`waqifShare`/`waqfRevenue`) ظاهرة
- `/dashboard/properties`, `/contracts`, `/income`, `/expenses` — قائمة + CRUD سريع (read-only)
- `/dashboard/beneficiaries` — أن البيانات الحساسة (national_id, bank_account, phone, email) **ظاهرة** للناظر
- `/dashboard/accounts`, `/distributions`, `/payment-invoices`, `/annual-report`, `/audit-log`
- `/dashboard/messages`, `/notifications` — التحقق من قائمة المستفيدين تأتي من `beneficiaries_safe` (Network tab)
- التحقق من شريط الأدوات/الإعدادات/سجل المراجعة

**ب) لوحة المستفيد (beneficiary):**
- `/beneficiary` — البطاقات + الإفصاح + الحصة
- التأكد من **عدم تسريب** بيانات مستفيدين آخرين عبر Network (فحص استجابات `beneficiaries`/`beneficiaries_safe`)
- `/beneficiary/contracts`, `/properties`, `/reports`, `/invoices`, `/expenses`, `/accounts`, `/annual-report`
- `/beneficiary/messages`, `/notifications`, `/support`
- التحقق من `RequirePublishedYears` يحجب السنوات غير المنشورة

**ج) (إن سمح الوقت) لوحة المحاسب:**
- `/dashboard` — أن `ADMIN_ONLY_TITLES` يخفي KPIs الخاصة بالناظر
- صفحات المالية وعدم الوصول لـ Bylaws/User Management

### 4) فحص الشبكة (Forensic Network Tap)
أثناء كل زيارة:
- اعتراض كل طلبات `rest/v1/beneficiaries*` والتأكد من:
  - دور `beneficiary` لا يرى سوى صفه (`user_id = auth.uid()`)
  - دور `beneficiary` لا يستدعي `beneficiaries` (الكامل) أبداً — فقط `beneficiaries_safe`
  - أعمدة `national_id`/`bank_account` غائبة في استجابات `_safe`
- اعتراض `payment_invoices`, `distributions`, `accounts` للتحقق من فلتر السنة المنشورة

### 5) فحص الكاش (Query Cache Forensics)
- بعد كل تنقل: قراءة `queryClient.getQueryCache().getAll()` عبر console eval للتحقق:
  - عدم وجود مفتاحين مختلفين بنفس الاسم الجذري يحملان أشكال بيانات متعارضة
  - عدم بقاء بيانات PII في الكاش بعد logout

## المخرجات

تقرير منظم بالأقسام التالية:
1. **النتائج الحرجة (Critical)** — أي تسريب PII أو كسر عرض
2. **النتائج المتوسطة (Major)** — تصادم كاش متبقي، تبويب يعرض بيانات قديمة
3. **النتائج الطفيفة (Minor)** — تحسينات تكوين queryKey، توحيد invalidation
4. **الاختبارات الجديدة المقترحة** (لن تُنفَّذ في وضع التخطيط)
5. **الفجوات الموثَّقة في docs** vs الواقع
6. **توصيات P0/P1/P2** مع روابط للملفات والأسطر

## القيود (Plan Mode)
- لن أعدّل أي ملف.
- سأنفّذ فقط: `rg` للبحث، `bunx vitest run` للقراءة، `browser--*` للفحص الحي، `code--view` لقراءة الملفات.
- أي إصلاح مكتشف سيُدرَج كتوصية مع diff مقترح في التقرير النهائي، ويُنفَّذ في الجولة التالية بعد موافقتك.

## التقديرات
- المرحلة 1 (Static): ~10 دقائق
- المرحلة 2 (Tests): ~5 دقائق
- المرحلة 3+4 (E2E + Network): ~15-20 دقيقة (تعتمد على توفر جلسات اختبار للأدوار الثلاثة)
- المرحلة 5 (Cache): ~5 دقائق

## ما أحتاجه منك قبل البدء
- تأكيد بدء التنفيذ بهذا النطاق، **أو** تضييق النطاق (مثلاً: تخطّي E2E الحي إن لم تكن جلسات الاختبار جاهزة) **أو** توسيعه (إضافة لوحة المحاسب بشكل كامل وإضافة لوحة الواقف).
