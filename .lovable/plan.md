

# إصلاح 3 مشاكل مؤكدة من الفحص الجنائي

## المشكلة 1: `body.name` و `u.name` غير مُعقّمين في إشعارات `admin-manage-users`

**الملف:** `supabase/functions/admin-manage-users/index.ts`

**الموضع الأول (سطر 297):**
```
p_message: `تم تسجيل مستفيد جديد: ${body.name || email}`
```
**الموضع الثاني (سطر 372):**
```
p_message: `تم تسجيل مستفيد جديد: ${u.name}`
```

**الإصلاح:** تعقيم الاسم بتقييد الطول وإزالة أي أحرف خاصة:
```typescript
const safeName = (name: string) => name.substring(0, 100).replace(/[<>&"']/g, '');
```
يُطبَّق على كلا الموضعين.

---

## المشكلة 2: `cron_check_contract_expiry` يُرسل تفاصيل المستأجر لجميع المستفيدين

**الملف:** دالة SQL `cron_check_contract_expiry` (تحتاج migration جديد)

**الحالة الحالية:** المستفيدون يتلقون رسالة تحتوي `contract_number` و `tenant_name`.

**الإصلاح:** تعديل الدالة عبر `CREATE OR REPLACE FUNCTION` لإرسال رسالة عامة للمستفيدين بدون تفاصيل العقد:
```sql
-- للأدمن: الرسالة التفصيلية (كما هي)
INSERT INTO notifications (...) SELECT ... msg ...
FROM user_roles ur WHERE ur.role = 'admin';

-- للمستفيدين: رسالة عامة بدون تفاصيل
INSERT INTO notifications (user_id, title, message, type, link)
SELECT b.user_id, 'تنبيه: عقد قارب على الانتهاء',
       'أحد العقود قارب على الانتهاء خلال ' || days_left || ' يوم',
       'warning', '/beneficiary/notifications'
FROM beneficiaries b WHERE b.user_id IS NOT NULL;
```

---

## المشكلة 3: TOCTOU في `useUpdateAdvanceStatus`

**الملف:** `src/hooks/useAdvanceRequests.ts`

**الحالة الحالية:** SELECT للتحقق من الحالة ثم UPDATE منفصل -- نافذة زمنية للسباق.

**الإصلاح:** دمج الفحص مع التحديث في عملية واحدة بإضافة `.in('status', allowedFromStatuses)` للـ UPDATE ثم التحقق من عدد الصفوف المتأثرة:

```typescript
// بدلاً من SELECT ثم UPDATE:
// نبني قائمة الحالات المسموح الانتقال منها
const VALID_TRANSITIONS_TO: Record<string, string[]> = {
  approved: ['pending'],
  rejected: ['pending', 'approved'],
  paid: ['approved'],
};

const allowedFrom = VALID_TRANSITIONS_TO[status];
if (!allowedFrom) throw new Error('حالة غير صالحة');

const { data, error } = await supabase
  .from('advance_requests')
  .update(updates)
  .eq('id', id)
  .in('status', allowedFrom)
  .select('id');

if (!data?.length) throw new Error('لا يمكن تغيير الحالة — ربما تم تعديلها مسبقاً');
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/admin-manage-users/index.ts` | تعقيم الاسم في سطري 297 و 372 |
| Migration جديد | تعديل `cron_check_contract_expiry` لإخفاء تفاصيل العقد عن المستفيدين |
| `src/hooks/useAdvanceRequests.ts` | دمج SELECT+UPDATE في عملية ذرية واحدة |

