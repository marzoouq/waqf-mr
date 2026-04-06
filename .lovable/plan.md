

# تقرير التدقيق الشامل المُحدّث — نظام إدارة وقف الثبيتي

## ملخص تنفيذي

المشروع ناضج (877 ملف، ~80K سطر) مع بنية نظيفة ومنظمة. لا توجد مشاكل هيكلية كبرى. التقرير يحدد إصلاحاً أمنياً واحداً ذا أولوية قصوى + تحديثات توثيقية للنتائج المقبولة.

---

## الجزء الأول: الأمان — 4 نتائج error + 4 نتائج warn

### 1.1 ⚠️ أولوية قصوى: jwt_role() في 32 سياسة SELECT
**المستوى:** error (من الماسح الأمني)
**المشكلة:** 32 سياسة SELECT عبر 22 جدولاً تستخدم `jwt_role()` (من JWT مخزّن مؤقتاً حتى ساعة)، بينما كل سياسات الكتابة تستخدم `has_role()` (فحص حي).

**الجداول المتأثرة:** access_log, access_log_archive, account_categories, accounts, annual_report_items, annual_report_status, app_settings, audit_log, beneficiaries, contract_fiscal_allocations, contracts, conversations, distributions, expense_budgets, expenses, fiscal_years, income, invoice_chain, invoice_items, invoices, messages, payment_invoices, properties, support_ticket_replies, support_tickets, tenant_payments, units, waqf_bylaws, webauthn_credentials, zatca_operation_log

**الحل:** Migration واحدة — DROP + CREATE POLICY لكل سياسة متأثرة، استبدال `jwt_role() = 'X'` بـ `has_role(auth.uid(), 'X'::app_role)`. لا تغيير في الكود.

**ملاحظة أداء:** `has_role()` هي `SECURITY DEFINER` + `STABLE` — Postgres يُخزّنها مؤقتاً داخل المعاملة. التأثير ضئيل لنظام <20 مستخدم.

### 1.2 ✅ سياسة التخزين القديمة — محلولة فعلاً
تم التحقق من قاعدة البيانات مباشرة: السياسة `Authenticated users can view invoices` **غير موجودة**. فقط `Role-based users can view invoices` + سياسات role-specific متبقية. النتيجة `invoice_storage_broad` في الماسح خاطئة — يجب حذفها.

### 1.3 ℹ️ zatca_certificates — مخاطرة مقبولة
- المفاتيح مشفرة عبر trigger + الكود لا يجلبها + RLS admin فقط
- نقل إلى Vault يضيف تعقيداً بدون مكسب عملي

### 1.4 ℹ️ Realtime — مخاطرة مقبولة
- لا يوجد Broadcast/Presence — فقط `postgres_changes` المحمي بـ RLS
- لا يمكن تعديل `realtime.messages` (مخطط محجوز)

### 1.5 ℹ️ Security Definer Views — مقصود بالتصميم
- `beneficiaries_safe` و `contracts_safe` — محمية بـ `security_barrier` + `CASE WHEN` + `WHERE auth.uid() IS NOT NULL`

---

## الجزء الثاني: البنية والهيكل

| المعيار | التقييم | ملاحظات |
|---------|---------|---------|
| فصل المسؤوليات | ممتاز ✅ | 0 استدعاءات Supabase في `src/components/` |
| TypeScript strict | ممتاز ✅ | 0 `any` غير مبرر |
| Logger موحّد | ممتاز ✅ | `console.*` فقط في Edge Functions (مقبول) و logger |
| Barrel files | منتظم ✅ | `index.ts` في كل مجلد رئيسي |
| حجم الملفات | مقبول ✅ | أكبر ملف: `LoginForm.tsx` (277 سطر) — تحت الحد |
| تكرار مكونات | لا يوجد ✅ | — |
| كود ميت | لم يُكتشف ✅ | — |

---

## الجزء الثالث: الأداء

| المعيار | التقييم |
|---------|---------|
| استعلامات مكررة | لا توجد ✅ — TanStack Query يدير التخزين المؤقت |
| useEffect | 25 مكوّن — معقول ✅ |
| Lazy loading | كل الصفحات + `ViewportRender` للمكونات الثانوية ✅ |
| PWA + Precache | محسّن ✅ |

---

## الجزء الرابع: التبعيات

| التبعية | الإصدار الحالي | الحالة |
|---------|---------------|--------|
| React | 19.2.4 | محدّث ✅ |
| TypeScript | 6.0.2 | محدّث ✅ |
| Vite | 5.4.21 | محدّث ✅ |
| TanStack Query | 5.96.2 | محدّث ✅ |
| Supabase JS | 2.101.0 | محدّث ✅ |
| Zod | 4.3.6 | محدّث ✅ |
| React Router | 7.14.0 | محدّث ✅ |

لا توجد تبعيات قديمة تحتاج تحديث.

---

## خطة التنفيذ المقترحة (بالأولوية)

### الأولوية 1: إصلاح أمني — Migration واحدة
استبدال `jwt_role()` بـ `has_role(auth.uid(), 'X'::app_role)` في جميع 32 سياسة SELECT.
- لا تغيير في الكود
- كل سياسة: `DROP POLICY IF EXISTS` → `CREATE POLICY` بنفس الاسم والمنطق مع `has_role()` بدل `jwt_role()`
- السياسات التي تحتوي على شروط إضافية (مثل `published = true` في `annual_report_status`) تُحافظ على شروطها

### الأولوية 2: تحديث نتائج الماسح الأمني
- حذف `invoice_storage_broad` (محلول ومؤكد من DB)
- حذف `invoices_bucket_authenticated_users` (نفس المشكلة — محلولة)
- تحديث `jwt_role_stale` و `jwt_role_vs_has_role_inconsistency` إلى "محلول" بعد تنفيذ الأولوية 1
- تحديث `zatca_certificates_private_key_exposure` و `realtime_messages_no_rls_policies` كمخاطر مقبولة مع التبرير

### الأولوية 3: تحسينات اختيارية مستقبلية (بدون تغيير الآن)
- إضافة `custom_access_token_hook` لمزامنة الأدوار فورياً في JWT (يلغي الحاجة للأولوية 1 مستقبلاً)
- تقسيم `LoginForm.tsx` إذا نمى فوق 300 سطر

---

## القيود المُلزمة
- لا تعديل على الكود — فقط migration قاعدة بيانات + تحديث نتائج الماسح
- لا تعديل على: `AuthContext.tsx`, `SecurityGuard.tsx`, `ProtectedRoute.tsx`, `config.toml`, `client.ts`, `types.ts`, `.env`
- الحفاظ على كل الميزات العاملة كأنظمة مقفلة
- لا تعديل على المخطط المحجوز `realtime`

