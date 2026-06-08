# خطة: مراجعة وتوسيع Security Memory (الإصدار 2)

## التصحيحات المطلوبة بعد قراءة الكود الفعلي

| القسم | الخطأ في النسخة الحالية | التصحيح |
|------|-------------------------|---------|
| 3 / 4.2 | "ممنوع service role في guard-signup" | guard-signup **يستخدم** `SERVICE_ROLE_KEY` لأن `auth.admin.createUser` تتطلبه — هذا استثناء مبرَّر |
| 7 | "استخدام SERVICE_ROLE_KEY في endpoint مرتبط بفعل مستخدم نهائي" ممنوع | يجب تخفيف الصياغة: ممنوع كبديل عن مصادقة، **مسموح** فقط لعمليات admin مثل createUser/deleteUser |
| 4.1 | rate limit أساسي دون تفاصيل | الأرقام الفعلية: IP 3/5min + per-national-id 5/hour |
| 4.2 | تفاصيل ضحلة | يحتاج HIBP + password complexity + registration_enabled + rollback + default role |
| 4.3 | عام | يحتاج توضيح أن WebAuthn له endpoints متعددة (challenge/register/verify) |

## الإجراء
استدعاء واحد لـ `security--update_memory` بالمحتوى الكامل أدناه (يستبدل الموجود).

---

## المحتوى الكامل المقترح

```markdown
# Security Memory — نظام إدارة وقف مرزوق بن علي الثبيتي

نظام إنتاجي لإدارة وقف عقاري سعودي (تأجير حصراً، لا بيع/شراء). يخدم أربعة أدوار بمستويات ثقة متفاوتة، ويتعامل مع PII حساس (هوية وطنية، IBAN) وأرصدة مالية يجب حمايتها من التلاعب والتسريب.

---

## 1. نموذج الوصول والأدوار

- **admin (ناظر الوقف)** — داخلي موثوق، يتجاوز RLS و route guards بشكل مقصود، الوحيد القادر على تعديل سنة مالية مغلقة
- **accountant (محاسب)** — داخلي موثوق، CRUD مالي بدون إقفال/إعدادات/مستخدمين، محجوب عن مسارات admin عبر `ACCOUNTANT_EXCLUDED_ROUTES`
- **beneficiary (مستفيد)** — خارجي، قراءة بياناته الخاصة فقط
- **waqif (واقف)** — خارجي، قراءة تقارير عامة فقط

الأدوار تُخزَّن **حصراً** في جدول `user_roles` ويُتحقَّق منها عبر `has_role(auth.uid(), role)` SECURITY DEFINER. ممنوع تخزين الأدوار في `profiles` أو JWT custom claims أو localStorage.

---

## 2. حدود البيانات والتشفير

- تشفير AES-256 عبر `pgcrypto` لأرقام الهوية الوطنية وأرقام IBAN
- RLS تقييدي (RESTRICTIVE) على الجداول المالية؛ السنوات غير المنشورة محجوبة عن الأدوار الخارجية
- السنوات المالية المغلقة محصّنة ضد التعديل لغير admin على مستوى DB + UI
- `audit_log` غير قابل للتعديل أو الحذف عبر `USING(false)`
- العرض `contracts_safe` يستخدم `security_invoker = false` **بقصد** لإخفاء أعمدة PII دون كسر RLS — ممنوع تبديل العَلَم

---

## 3. مصادقة Edge Functions

- جميع Edge Functions تعمل بـ `verify_jwt = false` ما عدا `process-email-queue` (المصادقة يدوية في الكود عبر `getUser()` أو `getClaims()`)
- ممنوع استخدام `getSession()` في Edge Functions
- `SUPABASE_SERVICE_ROLE_KEY` يُستخدم **فقط** للعمليات الإدارية الضرورية (`auth.admin.*`، تجاوز RLS عند الحاجة المؤكدة) — ممنوع استخدامه كبديل عن مصادقة المستخدم النهائي في عمليات قابلة للتنفيذ بـ RLS عادي
- كل Edge Function تقرأ body يجب أن تُحقّق المدخلات عبر Zod `safeParse` وترد 400 موحّد عند الفشل
- التسجيل المفتوح ممنوع — كل تسجيل يمر عبر `guard-signup`

---

## 4. نقاط Pre-Authentication المقصودة

النقاط التالية تعمل **قبل** تسجيل دخول المستخدم بقصد تصميمي. كلها تحافظ على `verify_jwt = false` ولا يجب تغيير ذلك.

### 4.1 `lookup-national-id`
- **الغرض**: تحويل رقم الهوية إلى بريد إلكتروني في شاشة الدخول، مع مصادقة كلمة مرور اختيارية في نفس الطلب
- **`verify_jwt = false` مقصود** — لا JWT في هذه المرحلة، استخدام `getUser()` غير صالح
- **لا يستخدم `SERVICE_ROLE_KEY` إطلاقاً** — يعمل بـ `anon` client فقط
- يستدعي حصراً RPCs ذات `SECURITY DEFINER` مع `SET search_path = public`:
  - `lookup_by_national_id` — يفك التشفير ويعيد البريد فقط
  - `check_rate_limit` — يطبّق الحدود
  - `get_rate_limit_count` — قراءة آمنة للعدّاد دون كشف جدول `rate_limits` لـ `anon`
  - `log_access_event` — تسجيل ناعم (لا يفشل الطلب)
- **طبقات الحماية**:
  1. **Zod schema** للـ body (national_id + password اختياري 8–128)
  2. **تطبيع رقمي** للأرقام العربية-الهندية والفارسية إلى لاتينية
  3. **تحقق صيغة**: 10 أرقام بدقة
  4. **Luhn check** لصيغة الهوية السعودية (تبدأ بـ 1 للمواطن أو 2 للمقيم) — يرفض الأرقام المزيّفة قبل أي استعلام DB
  5. **Rate limit per-IP**: 3 محاولات / 5 دقائق بمفتاح `lookup_nid:${ip}` — fail-closed عند فشل الفحص
  6. **Rate limit per-national-id**: 5 محاولات / ساعة بمفتاح `lookup_nid_target:${sha256(national_id)}` لمنع enumeration عبر IP rotation — الـ ID مُشفَّر SHA-256 لمنع تسريب الأرقام في `rate_limits`
  7. **Fixed + progressive delay**: 300ms + 200ms لكل محاولة مستهلكة لمنع timing enumeration
  8. **استجابات متطابقة الشكل**: عند عدم الإيجاد تُرجع `found:true, masked_email:"***@***.com"` بنفس بنية الإيجاد لمنع user enumeration
  9. **بريد مقنّع** (`u***@domain`) في الرد الناجح — لا يُكشف البريد الكامل أبداً
  10. عند تمرير كلمة مرور: مصادقة عبر `/auth/v1/token?grant_type=password` بالـ `anonKey`، والأخطاء تُوحّد لـ "بيانات الدخول غير صحيحة"
- `GRANT EXECUTE` لـ `anon` ممنوح صراحة للـ RPCs الأربع أعلاه فقط

### 4.2 `guard-signup`
- **الغرض**: نقطة التسجيل الوحيدة المسموحة — تنشئ المستخدم وتُعيّن الدور الافتراضي
- **`verify_jwt = false` مقصود** (المستخدم لم يُنشأ بعد، لا JWT)
- **يستخدم `SERVICE_ROLE_KEY` بمبرّر** — `auth.admin.createUser` و `auth.admin.deleteUser` (rollback) تتطلبه؛ لا توجد طريقة بديلة عبر RLS
- **طبقات الحماية**:
  1. **Rate limit per-IP**: 5 محاولات / 60 ثانية بمفتاح `signup:${ip}` عبر `check_rate_limit` — fail-closed
  2. **Zod schemas**: بريد صالح ≤255، كلمة مرور 8–128
  3. **تعقيد كلمة المرور**: حرف كبير + حرف صغير + رقم كحد أدنى
  4. **HIBP k-Anonymity check** على pwnedpasswords.com (SHA-1 prefix/suffix، timeout 3s، fail-open احترازياً مع تسجيل تحذير لتفادي تعطيل التسجيل عند انقطاع الخدمة الخارجية)
  5. **بوابة `registration_enabled`** من `app_settings` — يردّ 403 "التسجيل معطل حالياً" إذا أوقفه الناظر
  6. **`email_confirm: false`** — المستخدم لا يستطيع الدخول قبل تأكيد البريد، والتأكيد يدوي من الناظر فقط
  7. **تعيين دور افتراضي** `beneficiary` في `user_roles` — مع **rollback** يحذف المستخدم إذا فشل إدراج الدور (يمنع حسابات يتيمة بلا دور)
  8. **رسائل خطأ موحّدة**: لا تكشف حالة وجود البريد المسبق بشكل قابل للتفريق إلا في حالة "مسجل بالفعل" المتعمدة
- **الوصول الفعلي مقفل بثلاث طبقات** حتى بعد إنشاء الحساب: (أ) بريد غير مؤكد، (ب) تأكيد يدوي من الناظر، (ج) سياسات RLS تمنع الوصول بدون مصادقة كاملة

### 4.3 `webauthn` (مرحلة التحدي)
- **الغرض**: بدء WebAuthn challenge للتسجيل البيومتري والتحقق منه
- **`verify_jwt = false` مقصود** للمرحلة الأولى (بدء التحدي للمستخدم غير الموثّق بعد)
- لا يكشف token hashes ولا أي مادة سرية في الاستجابات
- مراحل verification تربط النتيجة بمستخدم موثّق وتسجّل الجلسة عبر RPCs مخصصة
- تفاصيل التنفيذ في `mem://auth/biometric-webauthn-implementation`

---

## 5. التخزين والأصول العامة

- **`waqf-assets` bucket عام بقصد** — يحتوي حصراً على أصول قوالب PDF/Email المستخدمة من Edge Functions، ولا يحتوي على أي بيانات مستخدمين
- باقي buckets خاصة وتمر عبر signed URLs قصيرة العمر

---

## 6. منطق مالي حساس (حماية من التلاعب)

- `execute_distribution` يحسب كل الحصص **server-side** ويتجاهل أي قيم من العميل
- الحدود القصوى للسلف محسوبة على إجمالي حصص المستفيدين الفعلي server-side
- VAT يُدار مركزياً عبر `vat_amount` — ممنوع إدخاله يدوياً كمصروف
- فواتير ZATCA: ICV chain متسلسل عبر `reserve_icv` ثم `commit_icv_chain` لمنع كسر التسلسل
- جميع التحصيلات والتوزيعات قيود محاسبية داخلية — لا تكامل بنكي خارجي

---

## 7. ما يجب ألا يحدث أبداً (Invariants)

- تخزين أدوار خارج `user_roles` (لا profile، لا localStorage، لا JWT claims قابلة للتحرير)
- تعديل سنة مالية مغلقة بواسطة أي دور غير `admin`
- كشف PII (هوية/IBAN) لدور لا يملك صلاحيته
- تسجيل مستخدم جديد بدون المرور عبر `guard-signup`
- foreign key مباشر إلى `auth.users` (يجب استخدام `profiles`)
- استخدام `SERVICE_ROLE_KEY` كبديل عن مصادقة المستخدم النهائي في عمليات يمكن إنجازها بـ RLS عادي (الاستخدام مسموح فقط لعمليات `auth.admin.*` الإلزامية)
- استخدام `getSession()` في Edge Function
- استخدام `console.*` في كود الواجهة (يجب استخدام `logger`)
- إدخال يدوي لـ VAT كمصروف

---

## 8. مخاطر مقبولة (لا يُبلَّغ عنها كثغرات)

| # | البند | المبرر |
|---|------|--------|
| 8.1 | `verify_jwt = false` على جميع Edge Functions (ما عدا `process-email-queue`) | المصادقة يدوية في الكود عبر `getUser()`/`getClaims()` حيثما يلزم |
| 8.2 | `verify_jwt = false` على `lookup-national-id`, `guard-signup`, `webauthn` | pre-auth بقصد تصميمي، محمي بطبقات بديلة موثقة في القسم 4 |
| 8.3 | `anon` لديه `EXECUTE` على `lookup_by_national_id`, `check_rate_limit`, `get_rate_limit_count`, `log_access_event` | جميعها SECURITY DEFINER مع `search_path` ثابت ومسؤولية محصورة وبدون كشف PII خام |
| 8.4 | `guard-signup` يستخدم `SERVICE_ROLE_KEY` | إلزامي لـ `auth.admin.createUser/deleteUser` (rollback)، محاط بـ rate limit + HIBP + registration_enabled |
| 8.5 | HIBP check بـ fail-open في `guard-signup` | لتفادي تعطيل التسجيل عند انقطاع الخدمة الخارجية، مع تسجيل تحذير ومحاولة ثانية على مستوى `auth.admin.createUser` |
| 8.6 | `waqf-assets` bucket عام | أصول قوالب فقط، بلا بيانات مستخدمين |
| 8.7 | `contracts_safe` بـ `security_invoker = false` | لإخفاء PII (وليس العكس) |
| 8.8 | `admin` يتجاوز RLS و route guards | تصميم النظام (ناظر الوقف صاحب الصلاحية المطلقة) |
| 8.9 | عدم وجود تكامل بنكي خارجي | مقصود — كل العمليات قيود محاسبية داخلية |
```
