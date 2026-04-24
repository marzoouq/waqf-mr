

# خطة التنفيذ المحدّثة — إيقاف إشعارات العقود عن المستفيد

## 🔍 توضيح المرفق (الأرقام لا تظهر)
الصورة تُظهر **0** في جميع البطاقات لأن السنة المالية المختارة (**2024-2025 مقفلة**) لا تحتوي على أي عقود فعلية للمستفيد المسجّل (`alkayala15`). الأرقام صحيحة منطقياً — ليست bug. لكن وجود بطاقتَي "العقود المنتهية" (X بلون أحمر) و"تنتهي خلال 3 أشهر" (تحذير) **يُسبّب ارتباكاً للمستفيد** لأنه:
- لا يملك صلاحية التجديد ولا اتخاذ إجراء
- البطاقات تَلفِت انتباهه لأمر إداري بحت يخص الناظر

---

## 🎯 الحل الموحَّد

### الجزء 1: إخفاء بطاقات العقود الإدارية عن المستفيد (UI فوري)

**الملف:** `src/components/contracts/ContractStatsCards.tsx`
- إضافة prop جديد: `variant?: 'admin' | 'beneficiary'` (افتراضي `'admin'`)
- عند `variant='beneficiary'`:
  - **إخفاء بطاقة "العقود المنتهية"** (الأحمر مع X)
  - **إخفاء بطاقة "تنتهي خلال 3 أشهر"** (التحذير الأصفر)
  - عرض 3 بطاقات فقط: إجمالي العقود / النشطة / الإيرادات التعاقدية
  - تعديل grid من `lg:grid-cols-5` إلى `lg:grid-cols-3` في وضع المستفيد

**الملف:** `src/pages/beneficiary/ContractsViewPage.tsx`
- تمرير `variant="beneficiary"` لـ `<ContractStatsCards>`

**الملف:** `src/components/contracts/ContractsTabContent.tsx` (صفحة الناظر)
- يبقى كما هو (5 بطاقات كاملة) — لا تغيير

### الجزء 2: تحكّم الناظر بإشعارات العقود للمستفيدين

**A) Hook جديد:** `src/hooks/data/settings/useNotificationSettings.ts`
- يقرأ ويكتب مفتاح `notification_settings` في `app_settings`
- يدعم المفاتيح الجديدة:
  - `notify_beneficiary_contract_expiry` (افتراضي: `false` ← لأن المستفيد لا يحتاج)
  - `notify_beneficiary_expired_contracts` (افتراضي: `false`)

**B) قسم جديد في `PermissionsControlPanel.tsx`:**
- بطاقة "إشعارات المستفيدين" تحت قسم "عناصر لوحة المستفيد"
- مفتاحان (Checkbox):
  - ☐ إرسال إشعار للمستفيدين عند اقتراب انتهاء العقد
  - ☐ إرسال تذكير أسبوعي للمستفيدين بالعقود المنتهية
- يُحفظ مع باقي الصلاحيات في `handleSave` (إضافة استدعاء `updateJsonSetting('notification_settings', ...)`)

**C) Migration: تعديل `cron_check_contract_expiry()`**
- قراءة الإعدادات من `app_settings` في بداية الدالة:
  ```sql
  SELECT (value->>'notify_beneficiary_contract_expiry')::bool 
  INTO v_notify_expiry FROM app_settings WHERE key='notification_settings';
  ```
- تخطّي كتلة `INSERT INTO notifications ... FROM beneficiaries` عند `false`
- الناظر **يبقى يستلم دائماً** بغض النظر عن الإعداد
- defaults آمنة: عند غياب المفتاح → `false` (المستفيد لا يستلم)

**D) تنظيف الإشعارات الموجودة (اختياري ضمن نفس migration):**
```sql
DELETE FROM notifications 
WHERE link = '/beneficiary/notifications' 
  AND title LIKE '%عقد%' 
  AND user_id IN (SELECT user_id FROM beneficiaries WHERE user_id IS NOT NULL);
```
يحذف الإشعارات السابقة المتعلقة بانتهاء العقود من صناديق المستفيدين.

---

## 📋 الملفات

### ملفات جديدة (1)
- `src/hooks/data/settings/useNotificationSettings.ts`

### ملفات معدّلة (3)
- `src/components/contracts/ContractStatsCards.tsx` — إضافة `variant` prop
- `src/pages/beneficiary/ContractsViewPage.tsx` — تمرير `variant="beneficiary"`
- `src/components/settings/security/PermissionsControlPanel.tsx` — قسم إشعارات المستفيدين + حفظ المفتاحين

### Migration (1)
- تعديل `cron_check_contract_expiry()` لاحترام المفتاحين الجديدين
- حذف الإشعارات القديمة من صناديق المستفيدين

---

## ✅ النتيجة المتوقعة

| المستفيد | الناظر |
|---|---|
| ✅ يرى 3 بطاقات فقط (إجمالي/نشطة/إيرادات) | ✅ يرى 5 بطاقات كاملة |
| ❌ لا يرى "العقود المنتهية" المربكة | ✅ يستلم إشعارات انتهاء العقود |
| ❌ لا يستلم إشعارات انتهاء العقود (افتراضياً) | ✅ يستلم تذكير أسبوعي بالمنتهية |
| ✅ صندوق الإشعارات أنظف | ✅ يتحكم بمفتاح إرسال للمستفيدين |

---

## 🔒 ضمانات

- المفاتيح الافتراضية `false` للمستفيد — يتم تنظيف الإرباك فوراً بدون انتظار تدخل الناظر
- الناظر يستطيع إعادة تفعيلها من `PermissionsControlPanel` إن أراد
- إشعارات الناظر تبقى تعمل دون تأثُّر
- لا تغيير في الجداول أو RLS — مجرد تعديل دالة cron موجودة

## ⏱️ الزمن المتوقع: ~12 دقيقة

