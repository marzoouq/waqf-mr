

# فحص جنائي لخطة الإصلاح — النتائج

## ملخص الفحص

فحصت كل بند من البنود الـ 7 في الكود الفعلي. اكتشفت **مشكلتين خطيرتين** في الخطة الأصلية ستُولّدان أخطاء جديدة إذا نُفذتا كما هي.

---

## البنود التي بها مشاكل في الخطة الأصلية

### ⛔ البند #4 (ResetPassword — إزالة hash fallback): **خطير — سيكسر إعادة تعيين كلمة المرور**

الخطة الأصلية تقول: "احذف `hash.includes('type=recovery')` واعتمد فقط على `PASSWORD_RECOVERY` event".

**لماذا هذا خاطئ؟**
- Supabase SDK يعالج الـ URL hash عند التحميل الأولي ويُطلق `PASSWORD_RECOVERY` event
- لكن في SPA، إذا وصل المستخدم مباشرة لـ `/reset-password#...`، قد يُطلق الحدث **قبل** أن يتم mount للـ `useEffect` listener
- الفرع `hash.includes('type=recovery')` هو **شبكة أمان ضرورية** لهذا السيناريو
- إزالته = المستخدم يرى "رابط غير صالح" رغم أن الرابط صالح فعلاً

**القرار:** حذف هذا البند بالكامل. الكود الحالي صحيح. الخطأ `updateUser` سيظهر فقط إذا انتهت صلاحية التوكن فعلاً، وعندها رسالة الخطأ واضحة.

---

### ⚠️ البند #1 (DashboardLayout — logAccessEvent): **مشكلة توقيت**

الخطة تقول: "أضف `logAccessEvent({ event_type: 'logout' })` في handleSignOut".

**المشكلة:** إذا استُدعي **بعد** `signOut()`، فإن `auth.uid()` في الـ RPC = `NULL` لأن الجلسة أُلغيت. دالة `log_access_event` تقبل `NULL` لكن لن نعرف **من** خرج.

**الإصلاح:** يجب استدعاء `logAccessEvent` **قبل** `signOut()` مع تمرير `user_id` صريحاً. نفس المشكلة في `handleIdleLogout`.

أيضاً: سجل `idle_logout` في Auth.tsx (سطر 71) يُسجل بعد وصول المستخدم لصفحة Auth — أي بعد signOut — لذا `auth.uid()` = NULL هناك أيضاً. لكن هذا مقبول لأنه يمرر `target_path` فقط بدون `user_id`.

---

## البنود السليمة (تم التحقق)

### ✅ البند #2 (useNotifications — إزالة playNotificationSound من deps)
- الكود الحالي: `[user?.id, queryClient, playNotificationSound]`
- `playNotificationSound` هو `useCallback` — إذا تغيرت dependencies داخله (مثل volume)، يُعيد إنشاء القناة بلا داعٍ
- `queryClient` أيضاً ثابت (مستورد من ملف) — لا حاجة له في deps
- **الحل الآمن:** استخدام ref للـ `playNotificationSound` وتقليص deps إلى `[user?.id]` فقط
- **لا يولّد أخطاء** لأن الـ callback يُقرأ من ref وقت التنفيذ

### ✅ البند #3 (Index.tsx — cleanup)
- إضافة `let cancelled = false` + `return () => { cancelled = true }` آمن تماماً
- لن يكسر أي شيء — فقط يمنع `setStats` على component غير mounted

### ✅ البند #5 (Unauthorized — توجيه ذكي)
- `Unauthorized` داخل `AuthProvider` (سطر 104 في App.tsx) ✅
- `useAuth()` متاح — يمكن قراءة `role` بأمان
- **لا مشاكل** — إذا `role` = null يذهب لـ `/` كـ fallback

### ✅ البند #6 (useIdleTimeout — visibilitychange)
- إضافة `visibilitychange` لعمل `resetTimer()` عند عودة التبويب للمقدمة
- **سلوك صحيح:** المستخدم عاد للتبويب = نشط = يُعاد ضبط المؤقت
- **لا يؤثر على الأمان:** إذا لم يعد المستخدم، المؤقت يستمر ويُنهي الجلسة

### ✅ البند #7 (Auth.tsx — nidLockedUntil في sessionStorage)
- آمن — `sessionStorage` يُمسح عند إغلاق المتصفح
- لا يتعارض مع الحماية في Edge Function (المصدر الحقيقي للقفل)

---

## الخطة المُعدَّلة النهائية (7 تغييرات في 6 ملفات)

### 1. `DashboardLayout.tsx` — تسجيل حدث الخروج **قبل** signOut
- استيراد `logAccessEvent` من `@/hooks/useAccessLog`
- في `handleSignOut`: إضافة `await logAccessEvent({ event_type: 'logout', user_id: user?.id })` **قبل** `signOut()`
- في `handleIdleLogout`: إضافة `await logAccessEvent({ event_type: 'idle_logout', user_id: user?.id })` **قبل** `signOut()`
- ملاحظة: `user` متاح من `useAuth()` في DashboardLayout

### 2. `useNotifications.ts` — إصلاح Realtime channel dependency
- إضافة `const playSoundRef = useRef(playNotificationSound)` + `useEffect` لتحديثه
- تغيير الاستدعاء في callback من `playNotificationSound()` إلى `playSoundRef.current()`
- تقليص dependency array إلى `[user?.id]` فقط

### 3. `Index.tsx` — إضافة cleanup flag
- إضافة `let cancelled = false` في بداية useEffect
- تغليف `setStats` و`setStatsLoading` بـ `if (!cancelled)`
- إضافة `return () => { cancelled = true }` في cleanup

### 4. `Unauthorized.tsx` — توجيه ذكي حسب الدور
- استيراد `useAuth`
- قراءة `role` وتحديد المسار (`/dashboard` للأدمن، `/beneficiary` للمستفيد، `/waqif` للواقف، `/` كـ fallback)

### 5. `useIdleTimeout.ts` — دعم Page Visibility
- إضافة `visibilitychange` listener
- عند `document.visibilityState === 'visible'` → استدعاء `resetTimer()`

### 6. `Auth.tsx` — حفظ nidLockedUntil في sessionStorage
- عند تعيين `nidLockedUntil`: حفظ في `sessionStorage`
- قراءة القيمة الأولية من `sessionStorage` عند mount

### ❌ محذوف: البند #4 (ResetPassword hash fallback)
- الكود الحالي صحيح — إزالة الـ fallback ستكسر إعادة تعيين كلمة المرور

---

## الملفات المتأثرة: 6 ملفات
`DashboardLayout.tsx`, `useNotifications.ts`, `Index.tsx`, `Unauthorized.tsx`, `useIdleTimeout.ts`, `Auth.tsx`

