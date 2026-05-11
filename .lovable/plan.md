## التحقق من اعتراضات المراجعة

### الاعتراض 1 — صياغة الحماية في `/preview`
**صحيح 100%.** الكود يثبت أن الحماية هي `Authorization: Bearer ${LOVABLE_API_KEY}` وليست JWT مستخدم. سيتم تصحيح الصياغة.

### الاعتراض 2 — ادعاء "موثّق في E/F" بلا قراءة مباشرة
**اعتراض منهجي صحيح، لكن المحتوى مثبت الآن بقراءة مباشرة:**

- `docs/api/network-inventory.md` موجود ويحتوي:
  - جدول 17 Edge Function مع auth/wrapper/retry/rate-limit/cache/validation
  - قسم "استثناءات مبررة" يدرج `notificationService` و`diagnosticsService` و`AuthContext` و`errorReporter` صراحةً
  - "Auth Abstraction Adoption Matrix" مع 4/17 يستخدمون `_shared/auth.ts` ومبررات الباقي
- `docs/api/edge-functions.md` يحتوي مدخلات صريحة لـ `email-admin`, `generate-invoice-pdf`, `guard-signup`, `lookup-national-id` (الأسطر 39-43, 110-135) بصياغات Version E/F (مثل `{ results: ... }` لـ generate-invoice-pdf في السطر 197).

**ملاحظة:** `dataFetcher.ts`, `fiscalYearService.ts`, `securityService.ts` **ليست مذكورة بالاسم** في جدول الاستثناءات الحالي — المذكور هو `notificationService` و`diagnosticsService` فقط. لذا سأضيفها صراحةً في المرحلة 1 لإغلاق هذه الفجوة.

---

## Version G النهائية المنقّحة

### المرحلة 1 — تحديثات توثيقية

**`docs/api/network-inventory.md`:**
- إضافة قسم فرعي "CORS Exceptions" يوثّق `auth-email-hook`:
  - **POST `/`** (الـ webhook الرسمي): يستخدم `getCorsHeaders(req)` المركزي + توقيع HMAC.
  - **GET `/preview`**: يستخدم `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Headers: 'authorization, content-type'`. الحماية عبر `Authorization: Bearer ${LOVABLE_API_KEY}` (وليس JWT مستخدم). استثناء intentional لمعاينة قوالب البريد من بيئات تطوير متعددة.
- توسيع جدول "استثناءات مبررة" بإضافة 3 صفوف:
  - `src/lib/services/dataFetcher.ts` — direct `.from()` reads — خدمة تصدير قراءة فقط بحدود `.limit(5000)` — خارج النطاق.
  - `src/lib/services/fiscalYearService.ts` — يجمع `.from(...).insert()` (CRUD مباشر) مع `rpc()` للـ RPCs — direct CRUD مقبول للجداول البسيطة، RPCs مغلفة — خارج النطاق.
  - `src/lib/services/securityService.ts` — direct `.from('access_log').select(...)` للقراءة الأمنية — graceful degradation محلي مع log + return — خارج النطاق.

**`docs/api/cors-verification.md`:**
- إضافة سطر استثناء `auth-email-hook /preview` بنفس الصياغة الدقيقة (LOVABLE_API_KEY، ليس JWT).

### المرحلة 2 — إصلاح silent inconsistency في `invoiceStorageService.ts`

**`uploadPaymentInvoicePdf`:**
- التقاط نتيجة `update().eq()` في متغير في كلا المسارين (primary + retry).
- فحص `error` و`logger.warn` مع: `invoiceId`, `storagePath`, نوع المسار (`primary` أو `retry`).
- الإبقاء على `return URL.createObjectURL(pdfBlob)` (UX لا يُحجب).

**`updateInvoiceFilePath`:**
- نفس النمط: التقاط `error`، `logger.warn` مع `invoiceId` و`storagePath`.
- إبقاء `Promise<void>` كما هو.

### المرحلة 3 — إصلاح fire-and-forget في `advanceService.ts`

**`notifyOnCreate`:**
- استبدال `.then(...)` chain بـ:
  ```ts
  void (async () => {
    try {
      const { data: benData, error } = await supabase.from('beneficiaries').select('user_id').eq('id', beneficiaryId).single();
      if (error) { logger.warn('[notifyOnCreate] failed to load beneficiary', { beneficiaryId, error }); return; }
      if (benData?.user_id) { notifyUser(...); }
    } catch (e) { logger.warn('[notifyOnCreate] unexpected error', { beneficiaryId, e }); }
  })();
  ```
- لا تغيير في توقيع الدالة العام أو سلوك fire-and-forget.

### المرحلة 4 — تحديث `.lovable/plan.md`

تسجيل Version G بصياغة دقيقة:
- النتائج المؤكدة بأدلة مباشرة فقط.
- التغييرات الفعلية (4 ملفات).
- البنود **المؤجَّلة** كقرارات أوسع (وليس "مرفوضة" بصياغة قاطعة):
  - توحيد adoption لـ `_shared/auth.ts` على functions إضافية → قرار refactor معماري واسع، مؤجل.
  - contract tests شاملة + runtime validation موسّع → جولة مخصصة.
  - إعادة كتابة `src/lib/services/*` → ليس ضرورياً لمعالجة findings الحالية.

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|---|---|
| `docs/api/network-inventory.md` | إضافة قسم CORS Exceptions + 3 صفوف استثناءات services |
| `docs/api/cors-verification.md` | سطر استثناء `auth-email-hook /preview` |
| `src/lib/services/invoiceStorageService.ts` | فحص error في 3 مواقع update + `logger.warn` |
| `src/lib/services/advanceService.ts` | تحويل `.then()` إلى async/try-catch |
| `.lovable/plan.md` | سجل Version G |

**صفر تعديلات على:** Edge Functions، ملفات المصادقة، `_shared/*`، wrappers (`invoke`/`rpc`)، types، client.ts، config.toml.

تغييرات الكود **معزولة وآمنة**: لا تغيّر public signatures ولا UX، فقط تكشف failures كانت صامتة.
