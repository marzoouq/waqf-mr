

# خطة إصلاح المشاكل الجديدة المكتشفة

بعد فحص الكود الفعلي، تبين أن عدة مشاكل من التقرير تم إصلاحها بالفعل في الجولات السابقة (اتجاه الرسائل، نوع contract في الإشعارات، فلتر المحادثات، زر الإقفال). المتبقي 8 مشاكل حقيقية تحتاج إصلاح.

---

## المشاكل الحرجة (2)

### 1. المحاسب يستطيع إقفال السنة عبر API مباشرة (ثغرة RLS)
**الملف:** قاعدة البيانات - سياسة RLS على جدول `fiscal_years`

السياسة الحالية `"Accountants can manage fiscal_years"` تستخدم `FOR ALL` مما يمنح المحاسب صلاحية UPDATE (تغيير status الى closed). الواجهة تمنعه لكن API call مباشر يسمح بذلك.

**الإصلاح:** تعديل سياسة RLS للمحاسب على `fiscal_years` لتقييدها بـ SELECT و INSERT فقط (بدون UPDATE/DELETE). اضافة سياسات منفصلة:
- `SELECT`: المحاسب يمكنه عرض السنوات
- `INSERT`: المحاسب يمكنه انشاء سنوات (اذا مسموح)
- `UPDATE/DELETE`: الناظر فقط

### 2. PDF الفواتير لا يدعم حالة 'overdue'
**الملف:** `src/utils/pdf/invoices.ts` سطر 27-33

دالة `statusLabel` تعالج `paid`, `pending`, `cancelled` فقط. حالة `overdue` تظهر بالانجليزية في وثيقة PDF عربية.

**الإصلاح:** اضافة `case 'overdue': return 'متأخرة';` في switch statement.

---

## المشاكل المتوسطة (3)

### 3. NotificationBell يعرض اشعارات غير مفلترة
**الملف:** `src/components/NotificationBell.tsx` سطر 27

يستخدم `data: notifications` و `unreadCount` (غير مفلتر) بينما `NotificationsPage` يستخدم `filteredData` و `filteredUnreadCount`.

**الإصلاح:** تغيير السطر 27 لاستخدام:
```
const { filteredData: notifications, filteredUnreadCount: unreadCount, ... } = useNotifications();
```
مع الابقاء على `data` فقط لحساب `readCount` (للحذف).

### 4. صفحة التسجيل لا توضح ان الحساب سيكون "مستفيد"
**الملف:** `src/pages/Auth.tsx`

عند التسجيل العام، لا توجد رسالة توضح ان الحساب سيُنشأ بدور "مستفيد" ويحتاج تفعيل من الناظر.

**الإصلاح:** اضافة نص توضيحي اسفل نموذج التسجيل: "سيتم انشاء حسابك كمستفيد. يحتاج الحساب تفعيل من ناظر الوقف."

### 5. المساعد الذكي يظهر لجميع الادوار
**الملف:** `src/components/DashboardLayout.tsx`

المساعد الذكي ظاهر لكل المستخدمين. البيانات محمية عبر Edge Function (عزل البيانات حسب الدور موجود في `ai-assistant/index.ts`) لكن يُفضل تقييد الظهور.

**الإصلاح:** التحقق من ان عزل البيانات في Edge Function يعمل بشكل صحيح (موجود بالفعل حسب memory). اضافة شرط دور في DashboardLayout لاظهار المساعد فقط لـ admin و accountant. المستفيد والواقف لا يرونه.

---

## المشاكل البسيطة (3)

### 6. تصحيح مسارات الوثائق
**الملف:** `docs/BENEFICIARY-PAGES.md`

- `/beneficiary/share` يجب ان يكون `/beneficiary/my-share`
- `/beneficiary/reports` يجب ان يكون `/beneficiary/financial-reports`

### 7. README.md لا يذكر دور المحاسب
**الملف:** `README.md`

**الإصلاح:** اضافة سطر المحاسب (accountant) في جدول الادوار.

### 8. BylawsPage - تحذير اذا اللائحة غير منشورة
**الملف:** `src/pages/dashboard/BylawsPage.tsx`

**الإصلاح:** اضافة تحذير بسيط في اعلى الصفحة اذا كان `bylaws_published !== 'true'` ينبه الناظر ان اللائحة غير منشورة للمستفيدين.

---

## ملاحظات حول مشاكل تم التحقق من اصلاحها

| المشكلة | الحالة |
|---------|--------|
| اتجاه الرسائل RTL | تم الاصلاح (justify-end لـ isMe) |
| نوع contract في NotificationsPage | تم الاصلاح (سطر 24) |
| فلتر chat في MessagesPage | تم الاصلاح (useConversations بدون فلتر) |
| زر اقفال السنة للمحاسب | تم الاصلاح (role === 'admin') |
| PropertyUnitsDialog التحقق من التواريخ | موجود بالفعل (سطر 169 يتحقق) |

---

## ترتيب التنفيذ

1. **اولا - الامني:** تعديل RLS للمحاسب على fiscal_years (migration)
2. **ثانيا - الكود:** PDF overdue + NotificationBell + Auth message + AI restriction
3. **ثالثا - الوثائق:** تصحيح المسارات + README + تحذير اللائحة

اجمالي: ~1 migration + ~7 ملفات كود + ~2 ملفات وثائق

