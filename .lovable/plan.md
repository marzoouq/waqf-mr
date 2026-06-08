# خطة: تحديث Security Memory شامل

## الإجراء الوحيد
استدعاء `security--update_memory` بالمحتوى أدناه (يستبدل الموجود بالكامل). لا تغييرات على كود أو ملفات أخرى.

## بعد الموافقة
- استدعاء واحد لـ `security--update_memory`
- إبلاغ المستخدم برسالة "I have updated the @security-memory..."

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

- `verify_jwt = false` على المستوى الافتراضي لـ Edge Functions — المصادقة **يدوية في الكود** عبر `getUser()` أو `getClaims()`
- ممنوع استخدام `getSession()` في Edge Functions
- ممنوع استخدام `SUPABASE_SERVICE_ROLE_KEY` كبديل عن مصادقة المستخدم في أي endpoint مرتبط بمستخدم نهائي
- كل Edge Function تقرأ body يجب أن تُحقّق المدخلات عبر Zod `safeParse` وترد 400 موحّد عند الفشل
- التسجيل المفتوح ممنوع — كل تسجيل يمر عبر `guard-signup` + تحقق بريد إلكتروني

---

## 4. نقاط Pre-Authentication المقصودة

النقاط التالية تعمل **قبل** تسجيل دخول المستخدم بقصد تصميمي. كلها تحافظ على `verify_jwt = false` ولا يجب تغيير ذلك.

### 4.1 `lookup-national-id`
- **الغرض**: تمكين المستفيد من إيجاد حسابه/استرداد بريده قبل تسجيل الدخول
- **`verify_jwt = false` مقصود**
- **لا يستخدم `SERVICE_ROLE_KEY` إطلاقاً** — يعمل بـ `anon` client فقط
- يستدعي حصراً RPCs ذات `SECURITY DEFINER` مع `SET search_path = public`:
  - `lookup_by_national_id` — يعيد بيانات محدودة فقط (existence + بريد مقنّع جزئياً)
  - `check_rate_limit` — يطبّق الحد الأساسي
  - `get_rate_limit_count` — قراءة آمنة للعدّاد دون كشف جدول `rate_limits`
- طبقات الحماية:
  1. **Luhn check** على رقم الهوية السعودي قبل أي استعلام DB
  2. **Rate limit أساسي** عبر IP
  3. **Rate limit ثانوي** بمفتاح `lookup_nid_target:${sha256(national_id)}` بمعدل 5/ساعة لمنع enumeration عبر تدوير IP
  4. الاستجابة **لا تكشف PII خام** — فقط بريد مقنّع جزئياً
- `GRANT EXECUTE` لـ `anon` ممنوح صراحة للـ RPCs الثلاث أعلاه فقط

### 4.2 `guard-signup`
- **الغرض**: فلترة كل محاولة تسجيل جديدة قبل إنشاء الحساب
- **`verify_jwt = false` مقصود** (المستخدم لم يُنشأ بعد)
- يطبّق قواعد العمل (تحقق بريد، منع تسجيل مفتوح، فحوصات قبول)
- ممنوع استخدام service role هنا

### 4.3 `webauthn/*` (مرحلة التحدي)
- **الغرض**: بدء WebAuthn challenge قبل المصادقة الكاملة
- **`verify_jwt = false` مقصود** للمرحلة الأولى من بدء التسجيل/التحقق
- لا يكشف token hashes ولا أي مادة سرية في الاستجابات
- المرحلة الثانية (verification) تربط النتيجة بمستخدم موثّق

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
- تسجيل مستخدم جديد بدون المرور عبر `guard-signup` وتحقق بريد
- foreign key مباشر إلى `auth.users` (يجب استخدام `profiles`)
- استخدام `SERVICE_ROLE_KEY` في endpoint مرتبط بفعل مستخدم نهائي
- استخدام `getSession()` في Edge Function
- استخدام `console.*` (يجب استخدام `logger`)
- إدخال يدوي لـ VAT كمصروف

---

## 8. مخاطر مقبولة (لا يُبلَّغ عنها كثغرات)

| # | البند | المبرر |
|---|------|--------|
| 8.1 | `verify_jwt = false` على Edge Functions | المصادقة يدوية في الكود عبر `getUser()`/`getClaims()` |
| 8.2 | `verify_jwt = false` على `lookup-national-id`, `guard-signup`, `webauthn/*` (مرحلة التحدي) | pre-auth بقصد تصميمي، محمي بطبقات بديلة موثقة في القسم 4 |
| 8.3 | `anon` لديه `EXECUTE` على `lookup_by_national_id`, `check_rate_limit`, `get_rate_limit_count` | جميعها SECURITY DEFINER مع `search_path` ثابت ومسؤولية محصورة |
| 8.4 | `waqf-assets` bucket عام | أصول قوالب فقط، بلا بيانات مستخدمين |
| 8.5 | `contracts_safe` بـ `security_invoker = false` | لإخفاء PII (وليس العكس) |
| 8.6 | `admin` يتجاوز RLS و route guards | تصميم النظام (ناظر الوقف صاحب الصلاحية المطلقة) |
| 8.7 | عدم وجود تكامل بنكي خارجي | مقصود — كل العمليات قيود محاسبية داخلية |
```

---

## ملاحظات

- الطول: ~110 سطر — ضمن حدود سليمة
- جميع البنود مستقاة من الذاكرة الحالية + التغييرات الفعلية في هذه الجلسة (إزالة service role من lookup-national-id، إضافة Luhn، rate limit ثانوي، RPC `get_rate_limit_count`)
- لا يُكرّر تفاصيل موجودة في `mem://` الأخرى — يكتفي بالإشارة المفاهيمية
