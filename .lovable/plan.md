

# خطة إصلاح المشاكل والثغرات المكتشفة — الجولة الرابعة

---

## تحليل التقرير

بعد فحص الكود، تم التحقق من جميع المشاكل المذكورة. إليك التصنيف:

---

## الإصلاحات المطلوبة (6 مشاكل قابلة للتنفيذ)

### 🔴 1. شهادة ZATCA وهمية بـ `is_active: true`

**الملف:** `supabase/functions/zatca-api/index.ts` سطر 333-340

**المشكلة:** عند غياب `ZATCA_API_URL`، يُحفظ سجل شهادة وهمي بـ `is_active: true` — قد يُستخدم خطأً في الإنتاج.

**الإصلاح:** تغيير `is_active: false` وإضافة حقل `environment: 'development'` للتمييز، مع إضافة فحص في مسار التوقيع يرفض الشهادات الوهمية.

---

### 🟠 2. إضافة cron لـ `cleanup_expired_challenges`

**المشكلة:** الدالة تُستدعى يدوياً فقط من `webauthn/index.ts`. التحديات المنتهية تتراكم إذا لم يُستخدم WebAuthn لفترة.

**الإصلاح:** إضافة `cron.schedule` يومي لتنظيف التحديات المنتهية (عبر INSERT في `cron.schedule` — ليس migration).

---

### 🟠 3. حماية `check-contract-expiry` بـ cron secret

**الملف:** `supabase/functions/check-contract-expiry/index.ts`

**المشكلة المزعومة:** الدالة مكشوفة بلا JWT.

**الحالة الفعلية:** ✅ **الدالة محمية فعلاً** — تتحقق من `service_role` عبر `timingSafeEqual` (سطر 34) ثم تتحقق من `getUser()` + `has_role(admin)` للاستدعاء اليدوي. لا يمكن لمستخدم مجهول تشغيلها. **لا حاجة لإصلاح.**

---

### 🟡 4. عمود "العقار" يعرض `-` في `ContractsViewPage`

**الملف:** `src/pages/beneficiary/ContractsViewPage.tsx` سطر 232

**المشكلة:** العمود "العقار" (سطر 218) يعرض `-` دائماً لأن `contracts_safe` لا يحتوي على `property_name`.

**الإصلاح:** استخدام `property_id` لجلب اسم العقار من جدول `properties` عبر join أو query منفصل، أو إضافة `property_name` للـ view عبر JOIN.

---

### 🟡 5. تحسين Cache المساعد الذكي

**الملف:** `supabase/functions/ai-assistant/index.ts`

**المشكلة:** الكاش يتجاهل تغييرات البيانات لمدة 5 دقائق.

**الإصلاح:** تقليل TTL إلى 60 ثانية (كافٍ لتقليل الحمل مع تحديث أسرع)، وإضافة إمكانية إبطال الكاش عبر query parameter `?refresh=true`.

---

### 🟡 6. إضافة `support` لدور `waqif` في `sections.ts`

**الملف:** `src/constants/sections.ts` سطر 58

**المشكلة:** الواقف لا يملك وصولاً للدعم الفني بينما المستفيد يملكه — غير منطقي.

**الإصلاح:** إضافة `'waqif'` لمصفوفة `roles` في قسم `support`.

---

## لن يُعدَّل الآن

| البند | السبب |
|-------|-------|
| مفتاح التشفير في Git (#1) | المفتاح موجود في تاريخ Git — تدوير المفتاح يتطلب: (1) إنشاء مفتاح جديد في Vault، (2) فك تشفير جميع البيانات بالمفتاح القديم وإعادة تشفيرها بالجديد عبر migration خاصة. هذا تغيير عالي الخطورة يحتاج تنسيقاً مع صاحب المشروع |
| هجرة مكررة (#4) | الهجرات المكررة تُنفَّذ مرة واحدة فقط (Supabase يتتبعها بالاسم). لا ضرر فعلي |
| قراءة OTP واحد (#7) | `zatca_otp_1` هو التصميم الحالي — OTP يُستخدم مرة واحدة عند الربط فقط |
| `check-contract-expiry` (#5) | **محمية فعلاً** بـ `service_role` check |
| غياب اختبارات (#10-11) | مهمة منفصلة لاحقاً |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/zatca-api/index.ts` | `is_active: false` + فحص في مسار التوقيع |
| `supabase/functions/ai-assistant/index.ts` | TTL → 60s + دعم `?refresh=true` |
| `src/pages/beneficiary/ContractsViewPage.tsx` | عرض اسم العقار بدل `-` |
| `src/constants/sections.ts` | إضافة `waqif` لـ `support` |
| `src/constants/rolePermissions.ts` | إضافة `support: true` لـ `waqif` |
| DB (insert tool) | جدولة cron لـ `cleanup_expired_challenges` |

