

# تدقيق معماري شامل — التقرير المعمق الثاني (تحقق وتوصيات)

بعد فحص الملفات المذكورة في تقريرك، إليك التحقق من كل نقطة مع خطة تنفيذ مرتبة حسب الأولوية.

---

## ✅ النتائج المؤكدة والمرفوضة

| # | النقطة | الحكم | ملاحظة |
|---|--------|-------|--------|
| 26 | `paramsRef` hack | ✅ مؤكد — أخطر نقطة | الأصفار تُمرر فعلاً ثم تُحدّث يدوياً (سطر 67-82) |
| 27 | 3 مسارات في `useMemo` | ✅ مؤكد | `adminShare: 0` في السنة المفتوحة مقصود لكن المسارات مبهمة |
| 28 | `__none__` سحرية | ✅ مؤكد — 162 تطابق في 22 ملف | مع `__skip__` أيضاً في بعض الملفات |
| 29 | Timeout 8s في signIn | ✅ مؤكد | شبكة أمان لكن UX سيئ |
| 30 | `usePropertyUnits` = 5 مسؤوليات | ✅ مؤكد — 182 سطر | قابل للتقسيم لكن ليس عاجلاً |
| 31 | `useNotifications` ضخم | ⚠️ جزئي — تم تقسيمه سابقاً | `useNotificationActions` مستخرج بالفعل، الملف الآن 108 سطر فقط |
| 32 | `queryClientRef` مكرر | ✅ مؤكد لكن ضروري | `useQueryClient()` ثابت لكن الـ ref يحل closure في callback |
| 33 | إشعار داخل mutation | ✅ مؤكد | `useSendMessage` يجلب بيانات المحادثة ويرسل إشعار |
| 34 | Arabic strings مكررة | ⚠️ جزئي | `CONTRACT_STATUS_LABELS` موجود فقط في `useRealtimeAlerts.ts` |
| 35 | toast داخل queryFn | ✅ مؤكد — في `usePaymentInvoices` و `useIncome` و `useExpenses` | |
| 36 | `hasNextPage` غير دقيق | ✅ مؤكد | `data.length === limit` (سطر 139) |
| 37 | Page لا يُرست عند تغيير السنة | ✅ مؤكد | لا reset في `useCrudFactory` |
| 38 | Browser version في fingerprint | ✅ مؤكد | |
| 39 | `MutationNotify` vs `CrudNotifications` | ✅ مؤكد | واجهتان مختلفتان لنفس الفكرة |
| 40 | `STALE_LIVE = 5s` مع Realtime | ✅ مؤكد لكن مقبول | يعمل كـ fallback |
| 41 | `ClientError` في ملف Tickets | ✅ مؤكد | سطر 44 في `useSupportTickets.ts` |
| 42 | Offset pagination في الرسائل | ✅ مؤكد | سطر 67-71 في `useMessaging.ts` |
| 43-48 | localStorage keys، UUID regex، `as never`، إلخ | ✅ مؤكدة | تحسينات صغيرة |

---

## خطة التنفيذ المرتبة

### 🔴 أولوية حرجة

**الخطوة 1: إصلاح `paramsRef` hack في `useAccountsPage` (#26)**
- إعادة ترتيب hooks بحيث يُحسب `calc` أولاً ثم يُمرر مباشرة لـ `useAccountsActions`
- إزالة `paramsRef.current` من خارج الـ hook
- ملفات: `useAccountsPage.ts`, `useAccountsActions.ts`

**الخطوة 2: استخراج مسارات حسابية من `useComputedFinancials` (#27)**
- إنشاء 3 دوال خالصة: `closedYearFinancials`, `activeYearFinancials`, `newYearFinancials`
- نقلها إلى `src/utils/financials/`
- ملف: `useComputedFinancials.ts`

**الخطوة 3: مركزة القيم السحرية `__none__` و `all` (#28)**
- إنشاء `src/constants/fiscalYearIds.ts` مع `FY_NONE`, `FY_ALL`, `isFyReady()`, `isFyAll()`
- استبدال 162 تطابق في 22 ملف

### 🟠 أولوية مهمة

**الخطوة 4: نقل toast من `queryFn` إلى `select` أو `onSuccess` (#35)**
- ملفات: `usePaymentInvoices.ts`, `useIncome.ts`, `useExpenses.ts`
- استخدام `select` callback مع debounce لمنع التكرار

**الخطوة 5: إصلاح `hasNextPage` + reset page عند تغيير السنة (#36, #37)**
- استخدام `{ count: 'exact' }` في `useCrudFactory`
- إضافة `useEffect` لـ reset `page` عند تغيير `fiscalYearId`
- ملف: `useCrudFactory.ts`

**الخطوة 6: تحويل offset إلى cursor pagination في الرسائل (#42)**
- استبدال `range()` بـ cursor-based (مثل `useNotifications`)
- ملف: `useMessaging.ts`

**الخطوة 7: نقل `ClientError` من `useSupportTickets` (#41)**
- إنشاء `useClientErrors.ts` منفصل
- ملف: `useSupportTickets.ts`

**الخطوة 8: توحيد `MutationNotify` و `CrudNotifications` (#39)**
- دمجهما في `src/lib/notify.ts`
- ملفات: `mutationNotify.ts`, `useCrudFactory.ts`

### 🟡 تحسينات

**الخطوة 9: إزالة browser version من fingerprint (#38)**
- تبسيط regex في `useSecurityAlerts.ts`

**الخطوة 10: مركزة localStorage keys (#43)**
- إنشاء `src/constants/storageKeys.ts`

**الخطوة 11: تقسيم `usePropertyUnits` (#30)**
- استخراج `useUnitMutations` و `useWholePropertyRental`

### 🟢 اختيارية

**الخطوة 12: نقل UUID regex (#44)، إصلاح `as never` (#45)، إضافة DB constraint للرسائل (#46)، إزالة `window.location.assign` (#47)**

---

## ملاحظات مهمة

- **النقطة 31 (useNotifications)**: تم تقسيمها سابقاً — الملف الآن 108 سطر فقط مع `useNotificationActions` مستخرج. لا حاجة لعمل إضافي.
- **النقطة 32 (queryClientRef)**: النمط مقبول تقنياً رغم التكرار — `useQueryClient` ثابت لكن الـ ref يحل مشكلة stale closure في Supabase callbacks. أولوية منخفضة.
- **النقطة 29 (Timeout 8s)**: إصلاح بسيط لكن يمس `AuthContext` المحمي — يحتاج طلب صريح.
- **النقطة 33 (إشعار في mutation)**: الحل المثالي هو نقله لـ database trigger أو Edge Function، لكن هذا تغيير بنيوي كبير.

---

## التقدير الزمني

| المجموعة | عدد الخطوات | التعقيد |
|-----------|------------|---------|
| حرجة (1-3) | 3 | متوسط-عالي |
| مهمة (4-8) | 5 | متوسط |
| تحسينات (9-12) | 4 | منخفض |

