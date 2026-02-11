

# التقرير الجنائي المعمّق - نتائج التحقيق النهائية

بعد فحص كل ملف سطراً بسطر، وتتبع تدفق البيانات بين الصفحات، ومقارنة المفاتيح في قاعدة البيانات مع الكود، هذه هي النتائج المؤكدة والمُثبتة:

---

## المشاكل المؤكدة بالدليل

### 1. تضارب مفاتيح النسب المالية (مشكلة جذرية حرجة)

**الدليل:**
- صفحة الإعدادات (`SettingsPage.tsx` سطر 35-36) تحفظ النسب بمفاتيح: `admin_share_percentage` و `waqif_share_percentage`
- لوحة التحكم (`AdminDashboard.tsx` سطر 31-32) تقرأ: `admin_share_percentage` و `waqif_share_percentage`
- صفحة الحسابات (`AccountsPage.tsx` سطر 62-63) تقرأ وتحفظ: `admin_percent` و `waqif_percent`

**الأثر الحقيقي:** عندما يعدّل الناظر النسبة من صفحة الإعدادات، لا تتأثر صفحة الحسابات والعكس صحيح. هذا يعني وجود نسختين مختلفتين من نفس البيانات في قاعدة البيانات.

**الحل:** توحيد المفاتيح في `AccountsPage.tsx` لتستخدم `admin_share_percentage` و `waqif_share_percentage` مثل باقي النظام.

---

### 2. قيمة التوزيعات مكتوبة يدوياً (995,000) 

**الدليل:**
- `AccountsPage.tsx` سطر 182: `distributionsAmount: 995000`
- `AccountsPage.tsx` سطر 183: `waqfCapital: waqfRevenue - 995000`
- `AccountsPage.tsx` سطر 306-307: نفس القيم في تصدير PDF

**الأثر:** عند إنشاء حساب ختامي، قيمة التوزيعات ثابتة دائماً بـ 995,000 بغض النظر عن البيانات الفعلية. هذا خطأ محاسبي خطير.

**الحل:** حساب قيمة التوزيعات ديناميكياً من حصص المستفيدين: `distributionsAmount = waqfRevenue * (totalBeneficiaryPercentage / 100)` ثم `waqfCapital = waqfRevenue - distributionsAmount`. الكود يحسب هذا فعلاً في سطر 170-171 لكنه لا يستخدمه!

---

### 3. السنة المالية ثابتة في التقارير

**الدليل:**
- `ReportsPage.tsx` سطر 67: `fiscalYear: '25/10/2024 - 25/10/2025'`
- `ReportsPage.tsx` سطر 137: نص ثابت في العنوان

بينما `AccountsPage` تجلب السنة المالية من `app_settings` بمفتاح `fiscal_year` وتجعلها قابلة للتعديل.

**الحل:** جلب السنة المالية من `app_settings` أو من `accounts[0]?.fiscal_year` بدلاً من القيمة الثابتة.

---

### 4. `useTenantPayments.ts` يستخدم `as any` رغم وجود النوع

**الدليل:**
- الجدول `tenant_payments` موجود في `types.ts` (سطر 519) بكل أنواعه
- لكن الهوك يستخدم `'tenant_payments' as any` في سطور 19 و 32

**الحل:** إزالة `as any` - الأنواع مولّدة ومتاحة.

---

### 5. `saveSetting` في AccountsPage بدون معالجة أخطاء

**الدليل:**
- سطر 71-73: الدالة تستدعي `upsert` بدون `try/catch` وبدون إشعار للمستخدم
- تستخدم `as any` على خيارات `onConflict`
- كل ضغطة مفتاح ترسل طلب لقاعدة البيانات (بدون debounce)

**الحل:** إضافة معالجة أخطاء + toast + debounce (300ms).

---

### 6. المساعد الذكي يستخدم anon key بدل session token

**الدليل:**
- `AiAssistant.tsx` سطر 44: `Authorization: Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
- المستخدم مسجّل دخوله (سطر 15: `const { user } = useAuth()`)

**ملاحظة مهمة بعد التعمق:** Edge function `ai-assistant` مُعدّة بـ `verify_jwt = false` في `config.toml`، لذا هذا ليس ثغرة أمنية فعلية - لكن استخدام session token أفضل ممارسة لأنه يسمح بتتبع الطلبات لكل مستخدم.

---

### 7. استيرادات غير مستخدمة (تسبب تحذيرات Build)

**الدليل المؤكد:**
- `ReportsPage.tsx` سطر 12: `LineChart, Line` مستوردة من recharts لكنها غير مستخدمة في أي مكان بالملف
- `BeneficiariesPage.tsx` سطر 1: `useMemo` مستوردة لكنها غير مستخدمة

**هل هذا سبب خطأ البناء؟** نعم، في وضع production build مع TypeScript strict، الاستيرادات غير المستخدمة قد تسبب أخطاء. هذا هو السبب الأرجح لفشل النشر.

---

### 8. لا يوجد Error Boundary

**الدليل:** `App.tsx` لا يحتوي على أي ErrorBoundary. إذا حدث خطأ runtime في أي مكون، المستخدم يرى شاشة بيضاء بدون أي رسالة.

---

### 9. تحذيرات Console (ليست أخطاء لكنها تشوش)

**الدليل من Console:**
- `DialogContent` في `WaqfInfoBar.tsx` يعطي تحذير "Function components cannot be given refs"
- `CartesianGrid` من recharts يعطي نفس التحذير

هذه من المكتبات نفسها (Radix UI و Recharts) وليست من كود المشروع.

---

## خطة الإصلاح (مرتبة حسب الأولوية والتأثير)

### المرحلة 1: إصلاح خطأ البناء + أخطاء البيانات

| # | الملف | الإصلاح |
|---|-------|---------|
| 1 | `ReportsPage.tsx` | إزالة `LineChart, Line` من الاستيراد |
| 2 | `BeneficiariesPage.tsx` | إزالة `useMemo` من الاستيراد |
| 3 | `useTenantPayments.ts` | إزالة `as any` من سطري 19 و 32 وإزالة التحويل المزدوج في سطر 22 |
| 4 | `AccountsPage.tsx` | توحيد المفاتيح: `admin_percent` -> `admin_share_percentage` و `waqif_percent` -> `waqif_share_percentage` |
| 5 | `AccountsPage.tsx` | استبدال 995000 بـ: حساب `distributionsAmount` من `waqfRevenue * totalBeneficiaryPercentage / 100` (القيمة المحسوبة فعلاً في سطر 171) |
| 6 | `ReportsPage.tsx` | جلب السنة المالية من `accounts[0]?.fiscal_year` أو `useAppSettings` |

### المرحلة 2: تحسين الجودة والأمان

| # | الملف | الإصلاح |
|---|-------|---------|
| 7 | `AccountsPage.tsx` | إضافة debounce (300ms) لـ `saveSetting` + معالجة أخطاء + toast |
| 8 | `AccountsPage.tsx` | إزالة `as any` من سطر 72 (خيارات onConflict) |
| 9 | `AiAssistant.tsx` | استخدام `supabase.auth.getSession()` للحصول على session token |
| 10 | `App.tsx` | إضافة ErrorBoundary component يلتقط الأخطاء ويعرض رسالة عربية |

