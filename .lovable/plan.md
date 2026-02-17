
# تقرير الفحص الجنائي العميق (Forensic Audit Report)
# نظام إدارة وقف مرزوق بن علي الثبيتي

---

## ملخص تنفيذي

تم فحص **17 جدول قاعدة بيانات**، **5 وظائف خلفية**، **22 هوك**، **47 مكون واجهة**، **41 سياسة أمان RLS**، **27 مشغل (Trigger)**، و**46 فهرس (Index)**. النظام بشكل عام **مستقر ومحكم البنية** مع بعض النقاط التي تستحق الانتباه.

---

## 1. قاعدة البيانات (17 جدول)

### 1.1 سلامة الجداول
| الجدول | RLS | مشغل تدقيق | مشغل updated_at | مشغل سنة مالية | الحالة |
|--------|-----|-------------|-----------------|----------------|--------|
| accounts | مفعّل | audit_accounts | update_accounts_updated_at | - | سليم |
| app_settings | مفعّل | - | - | - | سليم (اعدادات) |
| audit_log | مفعّل | - | - | - | سليم (محمي) |
| beneficiaries | مفعّل | audit_beneficiaries | update_beneficiaries_updated_at | - | سليم |
| contracts | مفعّل | audit_contracts | update_contracts_updated_at | - | سليم |
| conversations | مفعّل | - | update_conversations_updated_at | - | سليم |
| distributions | مفعّل | audit_distributions | - | - | سليم |
| expenses | مفعّل | audit_expenses | - | prevent_closed_fy_expenses | سليم |
| fiscal_years | مفعّل | audit_fiscal_years | - | - | سليم |
| income | مفعّل | audit_income | - | prevent_closed_fy_income | سليم |
| invoices | مفعّل | audit_invoices | update_invoices_updated_at | prevent_closed_fy_invoices | سليم |
| messages | مفعّل | - | - | - | سليم |
| notifications | مفعّل | - | - | - | سليم |
| properties | مفعّل | audit_properties | update_properties_updated_at | - | سليم |
| tenant_payments | مفعّل | - | update_tenant_payments_updated_at | - | سليم |
| units | مفعّل | audit_units | update_units_updated_at | - | سليم |
| user_roles | مفعّل | - | - | - | سليم |

**النتيجة**: جميع الجداول الـ 17 لديها RLS مفعّل. 10 مشغلات تدقيق تغطي جميع الجداول المالية والتعاقدية. 3 مشغلات حماية السنة المالية المغلقة تحمي income وexpenses وinvoices.

### 1.2 مشغلات التدقيق (Audit Triggers) - 10 مشغلات
تغطي: properties, contracts, income, expenses, beneficiaries, accounts, distributions, invoices, units, fiscal_years

**ملاحظة ايجابية**: جميع المشغلات مفعّلة (tgenabled = 'O') وتعمل بشكل صحيح.

### 1.3 الفهارس (Indexes) - 46 فهرس
تغطية شاملة تشمل فهارس على:
- الحقول المالية: `idx_income_date`, `idx_expenses_date`, `idx_income_fiscal_year`, `idx_expenses_fiscal_year`
- العقود: `idx_contracts_status`, `idx_contracts_end_date`, `idx_contracts_property_id`
- الإشعارات: `idx_notifications_user_unread`
- المحادثات: `idx_conversations_participants`, `idx_messages_conversation`

---

## 2. سياسات الأمان (RLS) - 41 سياسة

### 2.1 نمط الحماية المطبّق

```text
+------------------+------------------+------------------+
|   الناظر (admin)  |  المستفيد       |  الواقف          |
|  ALL على كل شيء  |  SELECT فقط     |  SELECT فقط     |
+------------------+------------------+------------------+
```

- **audit_log**: محمي بشكل حصين - SELECT للأدمن فقط، INSERT/UPDATE/DELETE = false (لا أحد يستطيع)
- **notifications**: المستخدم يرى/يحدّث/يحذف إشعاراته فقط
- **conversations**: حماية محكمة تمنع الوصول بدون participant_id
- **messages**: INSERT يتحقق من ملكية المحادثة عبر subquery

### 2.2 نتائج الفحص

| التصنيف | النتيجة |
|---------|---------|
| جداول بدون RLS | 0 (ممتاز) |
| سياسات مفرطة السماحية | 0 |
| فصل الأدوار | محكم - الأدمن فقط يملك ALL |
| حماية سجل التدقيق | حصينة (INSERT=false للجميع، المشغلات فقط تُدخل) |

---

## 3. الوظائف الخلفية (Edge Functions) - 5 وظائف

### 3.1 admin-manage-users
- **المصادقة**: getClaims + التحقق من دور admin في user_roles (سليم)
- **التحقق من المدخلات**: validateEmail, validatePassword, validateUuid, validateRole, validateNationalId (شامل)
- **قائمة بيضاء**: ALLOWED_ACTIONS تمنع الإجراءات غير المعروفة (سليم)
- **ملاحظة**: `confirm_email` action لا يتحقق من UUID باستخدام `validateUuid` (ثغرة طفيفة)

### 3.2 check-contract-expiry
- **المصادقة**: مزدوجة (service_role + getClaims) (سليم)
- **منطق**: يمنع تكرار الإشعارات عبر فحص الرسائل الموجودة اليوم (سليم)
- **ملاحظة إيجابية**: يستخدم `maybeSingle()` بدلاً من `single()`

### 3.3 auto-expire-contracts
- **المصادقة**: مزدوجة (سليم)
- **المنطق**: يحدّث العقود المنتهية ويُرسل إشعاراً (سليم)

### 3.4 lookup-national-id
- **حماية**: Rate limiting (3 طلبات/دقيقة) + تأخير عشوائي لمنع timing attacks (ممتاز)
- **التحقق**: regex للهوية الوطنية (10 أرقام) (سليم)
- **ملاحظة إيجابية**: رسالة خطأ موحدة لمنع enumeration attacks

### 3.5 ai-assistant
- **المصادقة**: getClaims (سليم)
- **حماية**: تحديد 20 رسالة و4000 حرف لكل رسالة (سليم)
- **النموذج**: google/gemini-2.5-pro عبر Lovable AI Gateway

### 3.6 تهيئة config.toml
جميع الوظائف الخمس مضبوطة على `verify_jwt = false` مع مصادقة يدوية داخلية - وهو النمط الصحيح والموثق.

---

## 4. المصادقة وإدارة الجلسات

### 4.1 AuthContext
- **التدفق**: `onAuthStateChange` -> `getSession` مع حماية ضد السباق (initialSessionHandled) (سليم)
- **جلب الدور**: `fetchUserRole` عبر `user_roles` جدول (سليم)
- **Idle Timeout**: قابل للتكوين عبر app_settings مع تحذير قبل 60 ثانية (سليم)
- **ملاحظة**: `handleIdleLogout` تستخدم `useCallback` بدون dependencies لـ `signOut` - هذا آمن لأن `signOut` ثابتة

### 4.2 ProtectedRoute
- **الحماية**: يتحقق من `user` و`role` و`allowedRoles` (سليم)
- **حالة التحميل**: يعرض loader أثناء التحقق (سليم)
- **التوجيه**: `/auth` لغير المسجلين، `/unauthorized` لغير المصرح لهم (سليم)

### 4.3 صفحة Auth
- **استعلامات ما قبل المصادقة**: تستخدم `.maybeSingle()` بشكل صحيح (تم إصلاحها)
- **إعادة تعيين كلمة المرور**: تستخدم `resetPasswordForEmail` مع redirectTo (سليم)
- **تسجيل الخروج التلقائي**: يعرض رسالة توضيحية عبر query parameter `reason=idle` (سليم)

---

## 5. الطبقة الأمامية (Frontend)

### 5.1 بنية التطبيق
- **Lazy Loading**: جميع الصفحات والمكونات الثقيلة تُحمّل بشكل كسول (ممتاز)
- **ErrorBoundary**: يغلف التطبيق بالكامل (سليم)
- **SecurityGuard**: يمنع نسخ/سحب المحتوى الحساس فقط (متوازن)
- **QueryClient**: `staleTime: 5 دقائق`, `retry: 1`, `refetchOnWindowFocus: false` (معقول)

### 5.2 مصنع CRUD (useCrudFactory)
- **نمط موحد**: جميع الهوكات (properties, contracts, income, expenses, beneficiaries, accounts, invoices, units) تستخدم المصنع (سليم)
- **Toast**: رسائل عربية موحدة للنجاح والخطأ (سليم)
- **Invalidation**: يُبطل الكاش تلقائياً بعد كل عملية (سليم)

### 5.3 useFinancialSummary
- **المنطق**: يقرأ من الحساب المخزن أولاً، ويحسب ديناميكياً كبديل (سليم - Forensic Pattern)
- **ربط السنة المالية**: يطابق بالـ `label` مع حماية ضد الربط العشوائي (لا يستخدم `accounts[0]` كبديل) (ممتاز)
- **أساس الحصص**: `totalIncome - totalExpenses - zakatAmount` (بدون رقبة الوقف وبدون الضريبة) (صحيح محاسبياً)

### 5.4 الإشعارات
- **Fire-and-forget**: لا تعطل العمليات الأساسية (سليم)
- **Realtime**: الإشعارات والمحادثات تستخدم `postgres_changes` (سليم)
- **حد**: يجلب آخر 50 إشعاراً فقط (معقول)

### 5.5 إخفاء البيانات الحساسة
- **maskData.ts**: يخفي الهوية الوطنية، الحساب البنكي، الهاتف، والبريد (سليم)

---

## 6. المشاكل المكتشفة

### 6.1 خطورة منخفضة

1. **حماية كلمات المرور المسربة معطلة** (Leaked Password Protection)
   - تحذير من Supabase Linter
   - يُنصح بتفعيلها من إعدادات المصادقة

2. **`confirm_email` في admin-manage-users لا يتحقق من UUID**
   - السطر 144: `if (!userId) throw new Error("userId required");` بدون `validateUuid(userId)`
   - خطورة طفيفة لأن الدالة بأكملها محمية بدور admin

3. **`getInvoiceFileUrl` تستخدم مسار عام لحاوية خاصة**
   - السطر 122-124 في `useInvoices.ts`: تبني URL عام لحاوية `invoices` وهي `is_public: false`
   - هذا URL لن يعمل. الدالة `getInvoiceSignedUrl` هي البديل الصحيح
   - يبدو أنها دالة قديمة غير مستخدمة (لكنها مُصدّرة)

4. **`useCrudFactory` لا يحدّ عدد الصفوف**
   - قد يتجاوز حد 1000 صف الافتراضي في Supabase للجداول الكبيرة
   - حالياً الجداول فارغة فهذا ليس مشكلة فورية

### 6.2 ملاحظات معمارية (ليست مشاكل)

1. **`tenant_payments` و`conversations` بدون مشغل تدقيق** - مقبول لأنها ليست جداول مالية أساسية
2. **`app_settings` بدون مشغل تدقيق** - مقبول لأن تغييراتها إدارية وليست مالية
3. **`notifications` و`messages` بدون مشغل تدقيق** - مقبول (بيانات تشغيلية)

---

## 7. ملخص درجات التقييم

| المحور | الدرجة | التعليق |
|--------|--------|---------|
| سلامة قاعدة البيانات | 9.5/10 | مشغلات شاملة، فهارس وقائية، حماية سنة مالية مغلقة |
| سياسات الأمان (RLS) | 10/10 | 41 سياسة تغطي جميع الجداول بفصل أدوار محكم |
| الوظائف الخلفية | 9/10 | مصادقة مزدوجة قوية، تحقق شامل، ثغرة UUID طفيفة |
| المصادقة والجلسات | 9.5/10 | idle timeout، حماية race condition، maybeSingle |
| المنطق المالي | 10/10 | حسابات جنائية دقيقة، قراءة من السجل المدقق |
| بنية الكود | 9.5/10 | CRUD factory، lazy loading، error boundary |
| حماية البيانات | 9/10 | إخفاء بيانات حساسة، منع enumeration، rate limiting |

**الدرجة الإجمالية: 9.5/10**

---

## 8. التوصيات (حسب الأولوية)

1. تفعيل حماية كلمات المرور المسربة (Leaked Password Protection) من إعدادات المصادقة
2. إضافة `validateUuid(userId)` في حالة `confirm_email` بدالة admin-manage-users
3. حذف أو إهمال دالة `getInvoiceFileUrl` غير الصالحة واستخدام `getInvoiceSignedUrl` فقط
4. إضافة `limit` في useCrudFactory كإجراء وقائي للمستقبل
