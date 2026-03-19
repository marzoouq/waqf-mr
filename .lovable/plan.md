

# فحص أمني جنائي شامل — النتائج والإصلاحات

## منهجية الفحص

تم فحص 5 طبقات بشكل منهجي:
1. **الكود المصدري**: جميع الملفات (.ts/.tsx) — بحث عن XSS, injection, eval, innerHTML, localStorage abuse, credential leaks
2. **وظائف الحافة (Edge Functions)**: جميع الـ 11 وظيفة — تحقق من المصادقة، CORS، rate limiting، تعقيم المدخلات
3. **سياسات RLS**: جميع الجداول — تناسق بين السياسات والكود المُستهلك
4. **أنماط الوصول للبيانات**: تتبع كل استعلام `.from()` في الواجهة — مطابقة مع الصلاحيات
5. **تسرب البيانات**: البحث عن `select('*')`, dangerouslySetInnerHTML, document.cookie, postMessage

---

## ❌ مشاكل مستوى WARN — تحتاج إصلاح فوري

### 1. GlobalSearch يقرأ من `contracts` مباشرة — كسر وظيفي + تسرب محتمل

**الملف**: `src/components/GlobalSearch.tsx` (سطر 143-145)

**المشكلة**: بعد تشديد RLS على جدول `contracts` (تقييده لـ admin+accountant فقط)، البحث الشامل يستعلم من `contracts` مباشرة لجميع الأدوار. النتيجة:
- المستفيد والواقف لا يحصلان على نتائج بحث العقود (كسر وظيفي صامت)
- إذا تم التراجع عن RLS مستقبلاً، سيتسرب `tenant_name` لأدوار غير مخولة

**الإصلاح**: استخدام `contracts_safe` بدلاً من `contracts` للأدوار غير الإدارية:
```typescript
const contractTable = isAdmin ? 'contracts' : 'contracts_safe';
let contractsQuery = supabase
  .from(contractTable)
  .select('id, contract_number, tenant_name, status, fiscal_year_id')
```

### 2. DataExportTab يصدّر PII كاملة من `contracts`

**الملف**: `src/components/settings/DataExportTab.tsx` (سطر 39)

**المشكلة**: `select('*')` على `contracts` يصدّر جميع الأعمدة بما فيها:
- `tenant_id_number` (رقم هوية المستأجر)
- `tenant_tax_number` (الرقم الضريبي)
- `tenant_crn`, `tenant_street`, `tenant_city` (بيانات شخصية)

رغم أن الوصول مقيد بالناظر فقط، إلا أن مبدأ "أقل بيانات ممكنة" يتطلب تحديد الأعمدة.

**الإصلاح**: تحديد الأعمدة المصدَّرة بشكل صريح واستبعاد PII الخام، أو إضافة تحذير واضح عند التصدير.

### 3. `useContractsByFiscalYear` يستخدم `select('*')` مع join

**الملف**: `src/hooks/useContracts.ts` (سطر 32)

**المشكلة**: `select('*, property:properties(*), unit:units(*)')` يجلب جميع أعمدة العقد بما فيها PII إلى الذاكرة في المتصفح. RLS يحمي من الأدوار غير المخولة، لكن البيانات تظهر في DevTools/Network tab لأي admin/accountant.

**الإصلاح**: تحديد الأعمدة المطلوبة فعلاً في الـ select بدلاً من `*`.

---

## ✅ نتائج الفحص — أمور سليمة

| الطبقة | النتيجة |
|--------|---------|
| **XSS / innerHTML** | `dangerouslySetInnerHTML` مستخدم فقط مع `JSON.stringify()` لـ structured data (آمن) وفي chart.tsx لـ CSS ثابت |
| **eval / Function** | لا يوجد استخدام لـ `eval()` أو `new Function()` |
| **CORS** | جميع Edge Functions تستخدم `getCorsHeaders(req)` مع قائمة بيضاء صارمة (4 origins + regex للمعاينة) |
| **المصادقة في Edge Functions** | جميع الوظائف تستخدم `getUser()` للتحقق من الهوية (ليس getSession) |
| **Rate Limiting** | `lookup-national-id` و `guard-signup` يستخدمان rate limiting عبر DB + fail-closed |
| **منع تعداد المستخدمين** | `lookup-national-id` يرجع بنية متطابقة سواء وُجدت الهوية أم لا + تأخير ثابت |
| **تعقيم المدخلات** | UUID validation, email regex, national_id (10 digits), password length checks |
| **service_role** | مستخدم فقط في Edge Functions (server-side)، لا تسرب في الواجهة |
| **Audit Log حصانة** | INSERT/UPDATE/DELETE محظورة عبر RLS (`false`) |
| **Cookie** | `document.cookie` مستخدم فقط لحالة الشريط الجانبي (غير حساس) |
| **localStorage** | يخزن فقط: fiscal_year_id (UUID), PWA update flag, beta banner dismiss — لا بيانات حساسة |
| **postMessage** | لا استخدام مباشر |
| **verify_jwt = false** | جميع Edge Functions في config.toml — لكنها تتحقق يدوياً من JWT عبر `getUser()` (نمط صحيح) |

---

## خطة الإصلاح

| # | الملف | التعديل | الخطورة |
|---|-------|---------|---------|
| 1 | `src/components/GlobalSearch.tsx` | استخدام `contracts_safe` للأدوار غير الإدارية | عالي (كسر وظيفي) |
| 2 | `src/components/settings/DataExportTab.tsx` | تحديد أعمدة التصدير بشكل صريح لـ contracts بدل `select('*')` | متوسط |
| 3 | `src/hooks/useContracts.ts` | استبدال `select('*')` بأعمدة محددة في `useContractsByFiscalYear` و crud factory | متوسط |

