

# تحقق من بنود الجولة الثالثة — بند بند

## ملخص سريع

من 14 بنداً في الجولة الثالثة: **4 مشاكل حقيقية تحتاج إصلاح**، **5 إنذارات كاذبة أو مبالغ فيها**، **5 ملاحظات تصميمية منخفضة لا تحتاج تدخل عاجل**.

---

## ✅ تم إصلاحه مسبقاً

| البند | الحالة |
|-------|--------|
| CRIT-02 (trigger 50% ثابتة) | ✅ migration `20260314023052` يقرأ من `app_settings` — مؤكَّد |
| MED-05 (notes مكشوف) | ❌ **لم يُنفَّذ فعلياً** — migration `20260314023052` يحتوي فقط على `validate_advance_request_amount` ولا يُعدِّل `beneficiaries_safe`. ملاحظة `notes` لا تزال مكشوفة |

---

## ❌ إنذارات كاذبة (5 بنود)

### CRIT-06 — `signIn` loading يتجمد للأبد ← **إنذار كاذب**
الـ safety timeout الـ 3 ثوانٍ موجود في `fetchRole` (useEffect على `user`). **لكن** `onAuthStateChange` يُحدِّث `user` → يُفعِّل useEffect → يبدأ `fetchRole` مع timeout. إذا لم يأتِ `onAuthStateChange` بعد `signInWithPassword` الناجح، فإن Supabase SDK يضمن إطلاقه — هذا سلوك موثَّق. السيناريو النظري (مشاكل شبكة بعد نجاح signIn) نادر جداً ولا يستحق تصنيف "حرج".

### CRIT-07 — `strictNullChecks: false` ← **ملاحظة تصميمية وليست ثغرة أمنية**
`tsconfig.app.json` يُعرِّف `"strict": false` صراحةً. هذا قرار تصميم واعٍ لمشروع كبير (126 اختبار + 200+ ملف). تفعيل `strictNullChecks` في مشروع قائم سيُولِّد مئات أخطاء TypeScript. هذا **ليس ثغرة أمنية** — الحماية الحقيقية في RLS والحراس البرمجيين server-side.

### HIGH-12 — `stack trace` في `access_log` ← **مبالغ فيه**
`access_log` محمي بـ RLS — فقط admin/accountant يقرأه. وهؤلاء أدوار موثوقة أصلاً. تخزين stack trace ضروري لـ debugging الإنتاج. `substring(0, 1000)` يحد الحجم. ليس تسريقاً لأن القراء مخوَّلون.

### HIGH-14 — migration قديم يحذف فواتير ZATCA ← **إنذار كاذب**
المشكلة كانت في migration قديم واحد. Migrations تُطبَّق بالترتيب — أي بيئة حالية تملك آخر migration الذي يُضيف `AND zatca_status IS NOT DISTINCT FROM 'not_submitted'`. لا يمكن تطبيق migration قديم بدون اللاحقة.

### MED-15 — `SecurityGuard` مؤجَّل 3 ثوانٍ ← **إنذار كاذب**
`SecurityGuard` هو مجرد **حماية عرض client-side** (منع نسخ/سحب على `data-sensitive`). ليس طبقة أمان حقيقية — كما يوثِّق الكود نفسه: "DevTools can bypass all client-side protections... Server-side access controls (RLS) are the real security layer". تأخير 3 ثوانٍ لا يُشكِّل نافذة هجوم.

---

## 🔴 مشاكل حقيقية تحتاج إصلاح (4 بنود)

### 1. CRIT-08 — `payment_invoices` RLS: beneficiary يرى كل الفواتير ← **مؤكَّد وحقيقي**
**التحقق:** سياسة `"Authorized roles can view payment_invoices"` (PERMISSIVE) تمنح `beneficiary` و`waqif` رؤية **جميع** فواتير الدفع. السياسة RESTRICTIVE تُقيّد فقط حسب السنة المالية المنشورة — **لا تُقيّد حسب هوية المستفيد**. المستفيد يرى مبالغ إيجارات كل المستأجرين.
**الإصلاح:** حذف `beneficiary`/`waqif` من سياسة SELECT (يرون الفواتير عبر `InvoicesViewPage` الخاص بهم الذي يعرض ملخصات فقط).

### 2. HIGH-10 — المحاسب يُعدِّل بيانات السنوات المقفلة ← **مؤكَّد**
**التحقق:** `prevent_closed_fiscal_year_modification` يستثني admin **و accountant** من الحماية. المحاسب يستطيع إضافة/تعديل إيرادات ومصروفات في سنة مقفلة — يُخالف مبدأ immutability.
**الإصلاح:** إزالة `accountant` من الاستثناء (فقط admin يُعدِّل بعد الإقفال).

### 3. HIGH-11 — `unpay_invoice` يحذف income بـ `LIKE` هش ← **مؤكَّد**
**التحقق:** البحث عن `LIKE '%فاتورة ' || v_invoice.invoice_number || '%'` هش وقد يحذف سجل خاطئ إذا تعددت السجلات بنفس المبلغ ورقم فاتورة مشابه.
**الإصلاح:** تقوية المطابقة بإضافة `payment_number` أو ربط مباشر بـ `invoice_id` في جدول `income`.

### 4. HIGH-13 — `refreshRole` يفشل بصمت ← **مؤكَّد جزئياً**
**التحقق:** الفشل الصامت يُبقي الدور القديم. لكن `refreshRole` يُستدعى فقط يدوياً (ليس في مسار تسجيل الدخول). الخطر الحقيقي محدود — لو أُزيل دور مستخدم من DB، الـ RLS server-side ستمنعه من العمليات الحساسة بغض النظر عن القيمة في الـ client. **مشكلة UX أكثر من أمنية.**
**الإصلاح:** إضافة toast تحذيري عند فشل `refreshRole`.

### + MED-05 (من الجولة السابقة) — `notes` لا يزال مكشوفاً في `beneficiaries_safe`
**التحقق:** migration `20260314023052` **لا يحتوي** على تعديل `beneficiaries_safe`. الإصلاح المُعلَن لم يُنفَّذ فعلياً.

---

## 🟡 ملاحظات تصميمية (5 بنود — لا تحتاج تدخل عاجل)

| البند | التقييم |
|-------|---------|
| MED-11 — waqif يرى carryforward | قرار تصميم — الواقف يراقب كل شؤون الوقف. مقبول |
| MED-12 — maskEmail للأسماء القصيرة | domain مكشوف عمداً لتوضيح أنه بريد. مخاطرة PII معدومة |
| MED-13 — PDF يقنّع base64 | المستدعي يُمرر دائماً بيانات مفكوكة عبر RPC. لا خطر عملي |
| MED-14 — recentSlowQueries بعد انتهاء session | بيانات أداء فقط (أزمنة استعلام). لا PII. مخاطرة صفر |
| LOW-06..09 | ملاحظات جودة كود — ليست ثغرات أمنية |

---

## خطة الإصلاح المقترحة

### Migration SQL جديد
1. **CRIT-08**: حذف `beneficiary`/`waqif` من سياسة SELECT على `payment_invoices`
2. **HIGH-10**: إزالة `accountant` من استثناء `prevent_closed_fiscal_year_modification`
3. **HIGH-11**: تقوية مطابقة الحذف في `unpay_invoice_and_revert_collection` بإضافة `payment_number`
4. **MED-05**: إعادة إنشاء `beneficiaries_safe` مع تمويه `notes` (الإصلاح الذي لم يُنفَّذ في الجولة السابقة)

### تعديل كود
5. **HIGH-13**: إضافة toast تحذيري في `refreshRole` عند الفشل

