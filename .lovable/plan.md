

# خطة إصلاح نهائية — إيقاف إشعارات العقود عن المستفيد في الإنتاج

## التشخيص

ثلاث طبقات تحتاج إصلاحاً متزامناً:

1. **بيانات قديمة:** ~357 إشعار عقد مخزّن للمستفيدين في `notifications`
2. **إعدادات ناقصة:** `app_settings.notification_settings` لا يحتوي المفاتيح الجديدة في الإنتاج
3. **لا طبقة حماية UI:** `useNotifications` يقرأ كل شيء كما هو

---

## التنفيذ

### 1) Migration — تثبيت الإعدادات في الإنتاج

دمج المفاتيح الجديدة داخل `app_settings.notification_settings` (JSONB merge آمن):
- `notify_beneficiary_contract_expiry = false`
- `notify_beneficiary_expired_contracts = false`

يحافظ على المفاتيح القديمة (`contract_expiry`, `payment_delays`, …) دون مساس.

### 2) Migration — تنظيف الإشعارات القديمة

حذف موجّه ودقيق:
```sql
DELETE FROM notifications
WHERE user_id IN (SELECT user_id FROM beneficiaries WHERE user_id IS NOT NULL)
  AND (
    title ILIKE '%عقد قارب%'
    OR title ILIKE '%عقود منتهية%'
    OR message ILIKE '%قارب على الانتهاء%'
    OR message ILIKE '%عقود منتهية بحاجة%'
  );
```

لا يمس إشعارات الناظر، ولا الإشعارات الأخرى للمستفيد.

### 3) طبقة حماية UI — helper + فلتر في `useNotifications`

**ملف جديد:** `src/lib/notifications/beneficiaryNotificationVisibility.ts`
- `isAdminContractNotification(n)` — يتعرف على إشعارات انتهاء/قارب على الانتهاء عبر العنوان والرسالة
- `shouldHideForBeneficiary(n, settings)` — يطبّق المنطق على إشعار واحد

**تعديل:** `src/hooks/data/notifications/useNotifications.ts`
- استدعاء `useNotificationSettings()` و `useUserRole()` (أو ما يكافئها)
- إذا كان المستخدم `beneficiary` و الإعدادان `false` → فلترة الإشعارات الإدارية من النتائج قبل تمريرها للـ UI

أثره الفوري:
- `BeneficiaryNotificationsCard` (لوحة المستفيد) → نظيفة
- `NotificationsPage` (سجل المستفيد) → نظيفة
- العداد `unreadCount` يُحتسب بعد الفلترة

### 4) لا تغيير في:
- `cron_check_contract_expiry()` — يبقى يرسل للناظر دائماً
- `useNotificationSettings.ts` — defaults صحيحة بالفعل
- `PermissionsControlPanel.tsx` — يحفظ JSON عبر `updateJsonSetting` (تم سابقاً)

---

## الملفات

### جديد (1)
- `src/lib/notifications/beneficiaryNotificationVisibility.ts`

### معدّل (1)
- `src/hooks/data/notifications/useNotifications.ts` — فلترة حسب الدور والإعدادات

### Migrations (2)
- تحديث `app_settings.notification_settings` (JSONB merge)
- تنظيف `notifications` القديمة للمستفيدين

---

## التحقق بعد النشر

1. `SELECT value FROM app_settings WHERE key='notification_settings'` يحتوي المفاتيح الجديدة
2. `SELECT COUNT(*) FROM notifications WHERE …` يرجع 0 لإشعارات العقود للمستفيدين
3. `/beneficiary` بطاقة الإشعارات لا تعرض رسائل العقود
4. `/beneficiary/notifications` السجل لا يعرضها

## ضمانات
- لا تغيير على schema أو RLS
- إشعارات الناظر تبقى كاملة
- حتى لو أُنشئت إشعارات مماثلة بالخطأ مستقبلاً، طبقة UI تحجبها

