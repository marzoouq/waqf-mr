

# خطة تنفيذ التحسينات المتبقية: #45، #49، #52

---

## التحسين #45: Server-side Pagination للفواتير

**الوضع الحالي:** `usePaymentInvoices` يجلب حتى 1000 فاتورة دفعة واحدة مع join كامل. التصفح موجود بالفعل في `usePaymentInvoicesTab` (15 عنصر/صفحة) لكنه client-side فقط.

**التغيير:** تحويل `usePaymentInvoices` إلى `useInfiniteQuery` مع جلب 50 فاتورة في كل صفحة من الخادم، مع الحفاظ على التوافق مع المستهلكين الحاليين.

**لكن** — بالنظر للكود الحالي، `usePaymentInvoicesTab` يحسب `summary` (إجماليات) من كل الفواتير، ويُفلتر ويُرتّب محلياً. تحويل الجلب لـ infinite query يكسر هذا المنطق بالكامل.

**الحل الأفضل والأقل تأثيراً:** الإبقاء على الجلب الكامل لكن مع **تقليل حجم البيانات المجلوبة** وإضافة **تحذير واضح** عند الاقتراب من الحد:

1. **`usePaymentInvoices`**: تقليل الـ join — جلب الحقول المطلوبة فقط بدل `*`
2. إضافة `count` query منفصل لعرض تنبيه إذا تجاوز العدد 900
3. عند تجاوز 1000: عرض toast تحذيري للمستخدم

### الملفات المتأثرة
- `src/hooks/data/usePaymentInvoices.ts`

---

## التحسين #49: نسبة الزكاة القابلة للتغيير

**الوضع الحالي:** `ZAKAT_RATE = 0.025` ثابتة في `ZakatEstimationReport.tsx`. تُستخدم فقط في تقرير تقدير الزكاة — الزكاة الفعلية تُدخل يدوياً في الحسابات الختامية.

**التغيير:**
1. إضافة `zakat_percentage` في `app_settings` (default: 2.5) عبر migration
2. قراءة القيمة في `ZakatEstimationReport` عبر `useSetting('zakat_percentage', '2.5')`
3. إضافة حقل في صفحة الإعدادات لتعديل النسبة

### الملفات المتأثرة
- Migration جديد لإضافة القيمة الافتراضية
- `src/components/reports/ZakatEstimationReport.tsx` — استبدال الثابت بقيمة من الإعدادات
- صفحة الإعدادات (إضافة حقل نسبة الزكاة)

---

## التحسين #52: تحميل المزيد للإشعارات

**الوضع الحالي:** `useNotifications` يجلب آخر 50 إشعاراً فقط بـ `.limit(50)`. لا يوجد زر "تحميل المزيد".

**التغيير:** تحويل `useNotifications` إلى `useInfiniteQuery` مع 50 إشعار/صفحة وزر "تحميل إشعارات أقدم" في `NotificationBell`.

**التفاصيل:**
1. **`useNotifications`**: تحويل إلى `useInfiniteQuery` مع `getNextPageParam` يعتمد على `created_at` لآخر عنصر
2. **`NotificationBell`**: إضافة زر "تحميل المزيد" أسفل القائمة مع `isFetchingNextPage` spinner
3. الحفاظ على `filteredData` و`filteredUnreadCount` و`markAsRead` وباقي المنطق الحالي
4. `unreadCount` يعتمد على الصفحة الأولى فقط (آخر 50) — وهذا مقبول لأن الإشعارات القديمة غالباً مقروءة

### الملفات المتأثرة
- `src/hooks/data/useNotifications.ts`
- `src/components/NotificationBell.tsx`

---

## ملخص التنفيذ

```text
┌─────────────────────┬───────────────────────────────────┐
│ التحسين             │ النطاق                            │
├─────────────────────┼───────────────────────────────────┤
│ #45 Pagination      │ تحسين select + تحذير الحد        │
│ #49 نسبة الزكاة     │ migration + setting + UI          │
│ #52 تحميل المزيد    │ infiniteQuery + زر في Bell        │
└─────────────────────┴───────────────────────────────────┘
```

