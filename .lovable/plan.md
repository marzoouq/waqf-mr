# خطة إصلاح ثبات قراءة الإشعارات (Web + Mobile)

## التشخيص (من فحص الكود + قاعدة البيانات + الكرونات)

| المؤشر | النتيجة |
|---|---|
| إجمالي الإشعارات في DB | **213** |
| المقروءة | **1** فقط |
| غير المقروءة | **212** |
| سياسات RLS على `notifications` | ✅ سليمة (SELECT/UPDATE/DELETE بـ `auth.uid()=user_id` + admin manage) |
| تريغرات تُعيد is_read=false | ❌ لا يوجد |
| Mutation `markAsRead/markAllAsRead` | يُستدعى بـ `.mutate()` fire-and-forget بدون optimistic ولا onError/toast |
| تحديث الـ UI | **لا يوجد optimistic update** — يعتمد على `invalidateQueries` ثم refetch (≥ دورة شبكة كاملة) |
| Cron `cron_check_contract_expiry` | **مجدول مرتين** يومياً (06:00 و 08:00) — تكرار غير مبرّر (الدالة نفسها تُدبّل dedupe لكن JOB مكرر) |
| Cron `cron_update_overdue_invoices` | يُدرج إشعاراً يومياً للأدمن — متوقع، لا تكرار |

### السبب الجذري لسيناريو المستخدم

1. المستخدم يضغط "قراءة الكل" أو ينقر إشعاراً → `markAllAsRead.mutate()` يُطلق طلب UPDATE.
2. الـ UI **لا يتغيّر فوراً** (لا optimistic) — يعتمد على نجاح الطلب ثم `invalidateQueries`.
3. على الجوال إذا أغلق المستخدم التطبيق قبل اكتمال الطلب (تحت دورة شبكة بطيئة، أو لأن لا feedback) → الطلب يُقتل، DB يبقى `is_read=false`.
4. عند العودة يرى الإشعارات غير مقروءة → تطابق صورة قاعدة البيانات الحالية (212/213 unread).
5. لا toast ولا onError → فشل صامت كلياً.

## الإصلاحات (5 ملفات + 1 migration)

### 1) `src/hooks/data/notifications/useNotificationActions.ts` — Optimistic + onError
- إضافة `onMutate` لكل من `markAsRead/markAllAsRead/deleteOne/deleteRead`:
  - `queryClient.cancelQueries`.
  - حفظ snapshot لـ `previousData`.
  - `setQueryData(['notifications', userId], …)` يُحدّث `is_read=true` فوراً.
  - return context للـ rollback.
- `onError`: rollback إلى snapshot + `toast.error('تعذّر تحديث حالة الإشعارات')` (عبر `sonner`).
- `onSettled`: `invalidateQueries` (السلوك الحالي).
- نتيجة: الـ UI يتغيّر فوراً، الـ cache يحتفظ بالحالة الجديدة حتى لو أُغلق التطبيق أثناء الطلب، و عند فشل الشبكة تظهر toast واضحة.

### 2) `src/components/notifications/NotificationBell.tsx` — Auto-mark-on-open (اختياري ذكي)
- عند فتح Popover ووجود `unreadCount > 0`، بعد ثانيتين من العرض، استدعاء `markAllAsRead.mutate()` تلقائياً (سلوك Gmail/Slack).
- يُلغى إذا أُغلق Popover قبل الـ 2س.
- مُفضّل سلوك يدوي + تلقائي معاً (يدوي عبر زر "قراءة الكل" يبقى).
- **سأطلب تأكيد المستخدم** على هذه النقطة قبل التنفيذ لأنها تغيّر السلوك المتوقع.

### 3) إضافة اختبارات `useNotificationActions.test.ts`
- اختبار optimistic update: قبل نجاح الطلب، `getQueryData` يُظهر `is_read=true`.
- اختبار rollback عند فشل: snapshot يُستعاد + toast.error مُستدعى.
- اختبار `markAllAsRead`: كل العناصر تُصبح `is_read=true` في الـ cache فوراً.

### 4) Migration: إزالة Cron المكرر
```sql
SELECT cron.unschedule('check-contract-expiry-daily'); -- 06:00 (مكرر)
-- نُبقي على 'check-expiry-daily' الساعة 08:00 (السلوك الفعلي اليومي)
```
- لا يحذف الدالة، فقط الجدولة المكررة.

### 5) `docs/notifications-qa.md` — قائمة فحص يدوية
- Desktop + Mobile (Android Chrome / iOS Safari):
  - فتح الجرس → ضغط إشعار واحد → تأكيد اختفاء النقطة فوراً.
  - ضغط "قراءة الكل" → كل الـ badges تختفي فوراً + بعد إغلاق التطبيق وفتحه: تبقى مقروءة.
  - فصل الشبكة + ضغط "قراءة الكل" → toast.error + الـ badges تعود.
  - فحص `/beneficiary/notifications` و `/dashboard` و navigation بين الصفحات.

## التحقق بعد التنفيذ (إلزامي)
1. `bunx vitest run src/hooks/data/notifications src/components/notifications` → جميع الاختبارات الجديدة + الموجودة تمر.
2. `bunx vitest run` (كامل السويت) → لا انحدار في 1898 اختبار.
3. **تحقق فوري في DB** بعد ضغط "قراءة الكل" من preview: استعلام `SELECT COUNT FILTER (WHERE is_read)` للمستخدم الحالي ليكون > 0.
4. مراجعة `docs/notifications-qa.md` يدوياً على الجوال.

## ما **لن** يُعدّل
- ملفات الإشعارات الأخرى (`NotificationsList`, `usePushNotifications`, إلخ).
- إعدادات `useNotificationVisibilityPrefs` (فلترة فقط).
- دوال DB (`cron_check_contract_expiry`, `cron_update_overdue_invoices`).

## سؤال للمستخدم قبل التنفيذ
هل تريد سلوك **"قراءة تلقائية عند فتح الجرس"** بعد 2 ثانية (مثل Gmail)، أم تبقى يدوية فقط (زر "قراءة الكل" / النقر على إشعار)؟ هذا يحدد ما إذا كنت سأضمّن النقطة (2) أعلاه.
