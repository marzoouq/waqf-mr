

# تحديث الوثائق وإصلاح خطأ برمجي مكتشف

## خطأ برمجي حرج مكتشف أثناء المراجعة

في `supabase/functions/ai-assistant/index.ts`، دالة `fetchWaqfData` تستخدم `isAdmin` في سطر 231 لكن `const isAdmin` مُعرّف في سطر 341. هذا يسبب `ReferenceError` بسبب temporal dead zone في JavaScript. النتيجة: **الدالة تتعطل عند أي استدعاء**.

**الإصلاح:** نقل تعريف `isAdmin` إلى أعلى دالة `fetchWaqfData` (بعد سطر 206 مباشرة).

---

## التحديثات المطلوبة للوثائق

### 1. `docs/FORENSIC-FIX-PLAN.md` -- إضافة إصلاحات الجولتين 3 و 4

إضافة قسمين جديدين:

**إصلاحات الجولة الثالثة (2026-02-27):**
- تعقيم `body.name` في إشعارات `admin-manage-users` (موضعان: create_user + bulk_create_users)
- إخفاء تفاصيل العقد عن المستفيدين في `cron_check_contract_expiry` (استخدام `ben_msg` عام)
- دمج SELECT+UPDATE في `useUpdateAdvanceStatus` لمنع TOCTOU race condition
- تعقيم رسالة خطأ WebAuthn registration
- حذف `invalidIds` من استجابة `generate-invoice-pdf`

**إصلاحات الجولة الرابعة (2026-02-27):**
- تقييد `fetchWaqfData` حسب الدور (المستفيد/الواقف: ملخص عام فقط)
- رفض الطلب عند فشل جلب الدور بدلا من الافتراض كمستفيد
- تعقيم `error.message` في `useAccountsPage` (موضعان)
- إصلاح `isAdmin` temporal dead zone في `fetchWaqfData`

### 2. `docs/INDEX.md` -- تحديث الإحصائيات

| الحقل | القيمة القديمة | القيمة الجديدة |
|-------|---------------|---------------|
| تاريخ الفحص | 2026-02-20 (الجولة 12) | 2026-02-27 (الجولة 16) |
| Edge Functions | 8 وظائف (محدّثة) | 8 وظائف (مع تقييد AI حسب الدور) |
| نموذج AI | google/gemini-2.5-pro | google/gemini-2.5-pro + flash |
| سجل التحديثات الأمنية | 4 إدخالات | 4 إدخالات أصلية + 8 إصلاحات جديدة |

### 3. `docs/API.md` -- تحديث توثيق `ai-assistant`

- إضافة توضيح أن البيانات تُفلتر حسب الدور
- توضيح أن المستفيد يرى ملخصاً عاماً فقط (بدون تفاصيل العقود أو أسماء المستأجرين)
- إضافة رمز الاستجابة 403 عند فشل جلب الدور
- تحديث وصف `admin-manage-users` لذكر تعقيم `safeName`
- إضافة أن `generate-invoice-pdf` لا يكشف معرفات غير صالحة

### 4. `docs/DATABASE.md` -- تحديث الدوال المخزنة

- تحديث وصف `cron_check_contract_expiry` لذكر أن المستفيدين يتلقون رسائل عامة (`ben_msg`) بينما الأدمن يتلقى التفاصيل
- إضافة `cron_cleanup_old_notifications` للقائمة (20 --> 21 دالة)

---

## ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|------------|
| `supabase/functions/ai-assistant/index.ts` | إصلاح خطأ `isAdmin` temporal dead zone |
| `docs/FORENSIC-FIX-PLAN.md` | إضافة إصلاحات الجولتين 3 و 4 |
| `docs/INDEX.md` | تحديث الإحصائيات والتواريخ |
| `docs/API.md` | تحديث توثيق ai-assistant و admin-manage-users |
| `docs/DATABASE.md` | تحديث وصف cron_check_contract_expiry + إضافة دالة |

