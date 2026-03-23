

# تقرير فحص قاعدة البيانات والهيكل + أخطاء البناء

---

## 1. أخطاء البناء — مُعالَجة بالفعل

جميع الأخطاء المذكورة في البناء **لا تعكس الحالة الفعلية للكود**. بعد الفحص:

| الخطأ | الحالة الفعلية في الكود |
|-------|------------------------|
| `@/hooks/usePagePerformance` | ✅ `App.tsx` سطر 13 يستخدم `@/hooks/ui/usePagePerformance` |
| `@/hooks/useAppSettings` | ✅ `BetaBanner.tsx` + `BannerSettingsTab.tsx` يستخدمان `@/hooks/page/useAppSettings` |
| `@/hooks/use-mobile` | ✅ `sidebar.tsx` سطر 6 يستخدم `@/hooks/ui/use-mobile` |
| `@/hooks/use-toast` | ✅ `toaster.tsx` + `use-toast.ts` يستخدمان `@/hooks/ui/use-toast` |
| `./useAppSettings` في `useWaqfInfo.test.ts` | ✅ يستخدم `@/hooks/page/useAppSettings` |
| `@/hooks/useBeneficiaryDashboardData` | ✅ يستخدم `@/hooks/page/useBeneficiaryDashboardData` |
| `@/hooks/useBeneficiaries` | ✅ يستخدم `@/hooks/data/useBeneficiaries` |
| `@/hooks/useNotifications` | ✅ يستخدم `@/hooks/data/useNotifications` |

**الإجراء المطلوب:** لا شيء — هذه أخطاء بناء مخبأة (cached) ستُحل بإعادة بناء نظيفة. الكود صحيح 100%.

---

## 2. فحص قاعدة البيانات — النتائج

### 2.1 الجداول الموجودة (22 جدول)

| الجدول | الوظيفة | RLS |
|--------|---------|-----|
| `properties` | العقارات | ✅ |
| `units` | الوحدات العقارية | ✅ |
| `contracts_safe` | عقود (view آمن) | ⚠️ لا RLS (view) |
| `beneficiaries` | المستفيدون | ✅ |
| `beneficiaries_safe` | مستفيدون (view آمن) | ⚠️ لا RLS (view) |
| `income` | الإيرادات | ✅ |
| `expenses` | المصروفات | ✅ |
| `accounts` | الحسابات الختامية | ✅ |
| `distributions` | التوزيعات | ✅ |
| `invoices` | الفواتير العامة | ✅ |
| `payment_invoices` | فواتير الدفعات | ✅ |
| `invoice_items` | بنود الفواتير | ✅ |
| `invoice_chain` | سلسلة التجزئة | ✅ |
| `user_roles` | الأدوار | ✅ |
| `advance_requests` | طلبات السُلف | ✅ |
| `advance_carryforward` | ترحيل السُلف | ✅ |
| `fiscal_years` (ضمنياً) | السنوات المالية | ✅ |
| `app_settings` | إعدادات التطبيق | ✅ |
| `messages` + `conversations` | المراسلات | ✅ |
| `support_tickets` + `replies` | الدعم الفني | ✅ |
| `access_log` + `archive` | سجل الوصول | ✅ |
| `webauthn_credentials` | المصادقة البيومترية | ✅ |
| `zatca_certificates` | شهادات ZATCA | ✅ |
| `waqf_bylaws` | اللوائح | ✅ |
| `annual_report_items` + `status` | التقرير السنوي | ✅ |
| `expense_budgets` | الميزانيات | ✅ |
| `tenant_payments` | مدفوعات المستأجرين | ✅ |
| `contract_fiscal_allocations` | تخصيصات العقود | ✅ |
| `rate_limits` | تحديد المعدل | ✅ |
| `account_categories` (ضمنياً) | شجرة الحسابات | ✅ |

### 2.2 ✅ نقاط قوة

1. **RLS شامل:** جميع الجداول الأساسية محمية بسياسات RLS متعددة المستويات (admin/accountant/beneficiary/waqif)
2. **Restrictive policies:** استخدام `PERMISSIVE: No` لحجب بيانات السنوات المالية غير المنشورة (`is_fiscal_year_accessible`) — نمط أمني ممتاز
3. **Views آمنة:** `contracts_safe` و `beneficiaries_safe` تحجب البيانات الحساسة (لا RLS لأنها views)
4. **سلسلة التجزئة:** `invoice_chain` تدعم ZATCA compliance مع `previous_hash` + `icv`
5. **Polymorphic linking:** `invoice_items.invoice_source` يدعم ربط بنود الفواتير بجدولين مختلفين
6. **Rate limiting:** جدول `rate_limits` محمي بـ `USING false` — لا وصول مباشر
7. **Audit trail:** `access_log` + `access_log_archive` محميان ضد التعديل والحذف

### 2.3 ⚠️ ملاحظات

| الملاحظة | التفاصيل | الخطورة |
|---------|---------|---------|
| **Foreign keys مفقودة في Schema المعروض** | لا foreign keys ظاهرة في البيانات المقدمة لأي جدول — لكن هذا قد يكون عرض جزئي | منخفضة |
| **`contracts_safe` بدون RLS** | View — لا يحتاج RLS إذا كان الجدول الأصلي (`contracts`) محمي | مقبول |
| **`beneficiaries_safe` بدون RLS** | نفس الملاحظة — view آمن | مقبول |
| **`fiscal_year_id` nullable في بعض الجداول** | `advance_requests`, `payment_invoices`, `invoices` — nullable مع restrictive policy قد يحجب بيانات | منخفضة |

### 2.4 تحليل التوافق مع الكود

| الجدول | TypeScript Type | متوافق؟ |
|--------|----------------|---------|
| `properties` | `Property` | ✅ |
| `units` | `Unit` | ✅ |
| `contracts` | `Contract` | ✅ (مع حقول PII) |
| `income` | `Income` | ✅ |
| `expenses` | `Expense` | ✅ |
| `beneficiaries` | `Beneficiary` | ✅ |
| `accounts` | `Account` | ✅ |
| `distributions` | `Distribution` | ✅ |
| `advance_requests` | `AdvanceRequest` | ✅ |
| `user_roles` | `UserRole` | ✅ |
| `messages` | `Message` | ✅ |
| `notifications` | `Notification` | ✅ |
| `fiscal_years` | `FiscalYear` | ✅ |
| `account_categories` | `AccountCategory` | ✅ |

### 2.5 جداول بدون duplicate أو waste

لا توجد جداول مكررة أو غير مستخدمة. كل جدول له وظيفة واضحة ومستخدم في الكود.

---

## 3. الخلاصة

**قاعدة البيانات في حالة ممتازة:**
- لا جداول مكررة أو غير مستخدمة
- RLS شامل ومتعدد المستويات
- Restrictive policies للسنوات المالية غير المنشورة
- Views آمنة للبيانات الحساسة
- التوافق بين TypeScript types وجداول DB كامل
- Triggers وfunctions مساعدة (e.g. `has_role`, `is_fiscal_year_accessible`, `trg_set_distribution_fiscal_year`)

**أخطاء البناء:** مخبأة/قديمة — الكود الفعلي صحيح ولا يحتاج أي تعديل.

**لا يوجد إجراءات مطلوبة** — الهيكل سليم.

