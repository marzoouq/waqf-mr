
# 🔬 تقرير التحقق الجنائي — الدورة الثالثة (100 نقطة)

**التاريخ:** 2026-04-07 | **المصدر:** فحص كود فعلي لكل ملف مذكور

---

## 📊 ملخص تنفيذي

| الحكم | العدد |
|---|---|
| ✅ مؤكد — يحتاج إصلاح | **62** |
| ⚠️ صحيح جزئياً أو أقل خطورة | **18** |
| ❌ خاطئ أو غير ذي صلة | **12** |
| 🔄 مكرر من نقطة أخرى | **8** |

---

## 🔴 المجموعة أ — أمان وإدارة المصادقة (#1–#20)

### ❌ #1 — localStorage لـ JWT
**الحكم: ❌ خاطئ — ملف محمي لا يُعدَّل**
`client.ts` ملف auto-generated محظور التعديل. هذا السلوك الافتراضي لـ Supabase SDK.

### ⚠️ #2 — `BIOMETRIC_ENABLED_KEY` بدون server validation
**الحكم: ⚠️ صحيح جزئياً**
سطر 27: `localStorage.getItem(BIOMETRIC_ENABLED_KEY)` يُستخدم كـ UI hint أولي.
سطر 32-53: الكود يتحقق فعلاً من DB بعدها ويُحدّث. **التصميم مقصود ومُوثّق** في الذاكرة.

### ✅ #3 — `nidLockedUntil` hardcoded
**الحكم: ✅ مؤكد** — سطر 64 في `nationalIdLogin.ts`: `sessionStorage.setItem('nidLockedUntil', ...)` hardcoded.
**ملاحظة مهمة:** يُستخدم `sessionStorage` وليس `localStorage`، وبالتالي يُمسح عند إغلاق المتصفح. لكن يبقى خارج `STORAGE_KEYS`.

### ✅ #4 — `waqf_notification_sound` hardcoded
**الحكم: ✅ مؤكد** — سطر 78 في `useNotificationActions.ts`: `localStorage.getItem('waqf_notification_sound')` بدل `STORAGE_KEYS.NOTIFICATION_SOUND`.

### ❌ #5 — `callAdminApi` يستدعي `getUser()` كطلب إضافي
**الحكم: ❌ غير قابل للتنفيذ** — قواعد المشروع تحظر `getSession()` صراحةً. `getUser()` مطلوب أمنياً. Edge Function لا تحمي بـ JWT تلقائياً لأن `verify_jwt = false`.

### ✅ #6 — `registerBiometric` يستدعي `getUser()` مرتين
**الحكم: ✅ مؤكد** — سطر 83 `getUser()` + سطر 121 `fetchCredentials()` → سطر 59 `getUser()` مرة أخرى.

### ✅ #7 — `useBiometricAuth` يكرر منطق `useWebAuthn`
**الحكم: ✅ مؤكد** — مقارنة `useBiometricAuth.ts` (سطور 17-43) مع `useWebAuthn.authenticateWithBiometric` (سطور 132-183): نفس التسلسل بالضبط: auth-options → startAuthentication → auth-verify → setSession.

### ⚠️ #8 — `handleRegistrationError` غير مختبر
**الحكم: ⚠️ صحيح — لكن أولوية منخفضة**
الدالة موجودة في `webAuthnErrors.ts` (سطر 21-57) وتعمل. غياب الاختبار خطر نظري.

### ❌ #9 — `getDeviceName()` قابل للانتحال
**الحكم: ❌ ليس مشكلة أمنية** — التقرير نفسه يعترف أنه UX فقط. الدالة (سطر 84-91) تُعيد اسم عام ("iPhone"/"Mac") وليس بيانات حساسة.

### ✅ #10 — `retry: 2` في `useAdminUsers`
**الحكم: ✅ مؤكد** — سطر 56 في `useUserManagementData.ts`: `retry: 2` ثابت بدون تمييز نوع الخطأ.

### ⚠️ #11 — `useOrphanedBeneficiaries` يستعلم PII
**الحكم: ⚠️ صحيح لكن محمي** — سطر 66-69 يستعلم من `beneficiaries` مباشرة. لكن RLS تقيّد الوصول لـ admin/accountant فقط.

### ⚠️ #12 — تداخل بين `useOrphanedBeneficiaries` و `useUnlinkedBeneficiaries`
**الحكم: ⚠️ صحيح** — تداخل منطقي موجود لكن كل استعلام يخدم غرضاً مختلفاً في UI.

### ❌ #13 — كلمة المرور في Edge Function body
**الحكم: ❌ التصميم مقصود** — `lookup-national-id` تبحث عن email من national_id ثم تُسجّل الدخول داخلياً. لا يمكن فصل العملية لأن ذلك يكشف email المستخدم. HTTPS مفروض.

### ⚠️ #14 — `result.users as ManagedUser[]` cast غير آمن
**الحكم: ⚠️ صحيح — خطر نظري** — سطر 49. Edge Function مُتحكم بها، لكن Zod validation أفضل.

### ✅ #15 — `useSetRoleMutation` لا يُبطل orphaned/unlinked
**الحكم: ✅ مؤكد** — سطر 70 في `useUserManagementMutations.ts` يُبطل `['admin-users']` فقط.
**ملاحظة:** `useLinkBeneficiaryMutation` (سطر 99-100) **يُبطل كليهما** ✅ — لكن `useSetRoleMutation` لا يفعل.

### ✅ #16 — `useWebAuthn` useEffect بدون cancelled check كافٍ
**الحكم: ✅ مؤكد جزئياً** — سطر 34 `if (!user || cancelled) return;` بعد أول await ✅.
سطر 39 `if (cancelled) return;` بعد ثاني await ✅.
**لكن** سطر 41 `setIsEnabled(dbEnabled)` يُنفَّذ بدون check **بين** سطر 40 و 42. إذا حدث unmount بعد `count` query وقبل `setIsEnabled` → state update بعد unmount.
**الخطورة: منخفضة** — React 18+ لا يُحذّر من state updates بعد unmount.

### ⚠️ #17 — `fetchCredentials` بدون فحص mounted
**الحكم: ⚠️ صحيح — خطورة منخفضة** — React 18+ يتحمل هذا. لكن استخدام `useIsMountedRef` أفضل.

### ✅ #18 — `handleBiometricLogin` بدون double-submit guard
**الحكم: ✅ مؤكد** — سطر 14 في `useBiometricAuth.ts` لا يتحقق من `biometricLoading`.
**ملاحظة:** الزر في `BiometricLoginButton.tsx` سطر 19 `disabled={biometricLoading}` — يمنع الضغط المزدوج عبر UI. لكن حماية على مستوى الهوك أفضل.

### ✅ #19 — orphaned/unlinked تُجلب دائماً
**الحكم: ✅ مؤكد** — سطر 40-41 في `useUserManagement.ts` بدون `enabled` parameter.

### ✅ #20 — `logAccessEvent` بدون catch في `handleSignOut`
**الحكم: ✅ مؤكد** — سطر 54 في `useLayoutState.ts`: `await logAccessEvent(...)` بدون `.catch()`. إذا فشل لن يصل لـ `signOut()`.

---

## 🟠 المجموعة ب — Edge Functions والبنية (#21–#40)

### ✅ #21 — `handleOnboard` يكرر `zatcaService.zatcaOnboard`
**الحكم: ✅ مؤكد** — سطر 161 في `useZatcaManagement.ts` vs سطر 6-8 في `zatcaService.ts`: نفس الاستدعاء بالضبط.

### ⚠️ #22 — `zatcaTestConnection` غير متاح من صفحة ZATCA
**الحكم: ⚠️ صحيح — ميزة مفقودة وليس bug**

### ✅ #23 — `useBeneficiarySummary` يستخدم `STALE_REALTIME`
**الحكم: ✅ مؤكد** — سطر 45 في `useBeneficiarySummary.ts`: `staleTime: STALE_REALTIME` لـ Edge Function مكلفة.

### ⚠️ #24 — `callAdminApi` بدون نوع إرجاع
**الحكم: ⚠️ صحيح** — سطر 18-25 في `useUserManagementData.ts` يُعيد `res.data` بدون typing.

### ✅ #25 — `useGenerateInvoicePdf` يستدعي `getUser()` في mutationFn
**الحكم: ✅ مؤكد** — سطر 147-148 في `useInvoices.ts`. **لكن** بما أن `verify_jwt = false`، هذا الفحص ضروري فعلاً! Edge Function تحتاج user_id.
**تصحيح الحكم: ❌ الفحص مطلوب** — لا يجب إزالته.

### ⚠️ #26 — حذف DB ثم Storage بدون rollback
**الحكم: ⚠️ صحيح — خطر منخفض** — سطر 106-114. الـ warning يُسجّل (سطر 113). ملف يتيم خطر ضئيل.

### ⚠️ #27 — `logger.warn` بدون إرسال للخادم
**الحكم: ⚠️ صحيح** — سطر 113. لكن الخطورة منخفضة.

### ✅ #28 — `useBeneficiaryUsers` بدون `Array.isArray` check
**الحكم: ✅ مؤكد** — سطر 20 في `useBeneficiaryUsers.ts`: `(data?.users || []).filter(...)`.

### ✅ #29 — `useDashboardSummary` yoy بدون `?? 0`
**الحكم: ✅ مؤكد** — سطر 189 في `useDashboardSummary.ts`: `prevTotalIncome: y.prev_income` بدون fallback.

### ✅ #30 — `clearZatcaOtp` بدون error handling
**الحكم: ✅ مؤكد** — سطر 25-27 في `zatcaService.ts`.

### ✅ #31 — `saveZatcaSettings` يُرسل `updated_at` من العميل
**الحكم: ✅ مؤكد** — سطر 29 type signature يتضمن `updated_at: string`.

### ⚠️ #32 — Edge Functions بدون timeout
**الحكم: ⚠️ صحيح — لكن Supabase SDK له timeout افتراضي** (60s). أقل خطورة مما ذُكر.

### ❌ #33 — loading بدون reset عند خطأ
**الحكم: ❌ خاطئ** — سطر 167-169: `finally { setOnboardLoading(false); }` موجود ✅. سطر 181-183: `finally { setProductionLoading(false); }` موجود ✅.

### ✅ #34 — `return data` في `complianceCheck.onSuccess`
**الحكم: ✅ مؤكد** — سطر 152: `return data;` بلا فائدة.

### ❌ #35 — `fiscalYearLabel` ناقص من queryKey
**الحكم: ❌ خاطئ** — `fiscalYearLabel` لا يُؤثّر على البيانات المُسترجعة (يُرسل كـ parameter للعرض فقط). إضافته لـ queryKey سيُسبب re-fetch غير ضروري.

### ⚠️ #36 — `nextPage` غير مستخدم
**الحكم: ⚠️ صحيح** — dead code لكن ضرره صفر.

### ⚠️ #37 — فلترة محلية غير قابلة للتوسع
**الحكم: ⚠️ صحيح** — سطر 48-63 في `useUserManagement.ts`. عدد المستخدمين صغير حالياً.

### ⚠️ #38 — `email.eq.` خاطئ
**الحكم: ⚠️ غير مؤكد** — PostgREST يقبل `eq.` كـ empty string comparison فعلاً. يحتاج اختبار.

### ⚠️ #39 — `useBeneficiaryUsers` بدون `name`
**الحكم: ⚠️ صحيح** — سطر 22: `{ id: u.id, email: u.email || u.id }` بدون name.

### ⚠️ #40 — `useToggleRegistration` بدون optimistic update
**الحكم: ⚠️ صحيح — أولوية منخفضة** — toggle سريع ونادر.

---

## 🟡 المجموعة ج — Realtime وأداء (#41–#60)

### ✅ #41 — `tablesKey` بدون `useMemo`
**الحكم: ✅ مؤكد** — سطر 28 في `useDashboardRealtime.ts`: `JSON.stringify(tables)` بدون memo.

### ❌ #42 — `instanceIdRef` يتغير
**الحكم: ❌ خاطئ** — `useRef` ثابت بالتصميم. التقرير نفسه يعترف.

### ⚠️ #43 — `ch.topic` internal property
**الحكم: ⚠️ صحيح — لكن ضروري** — لا بديل public API.

### ✅ #44 — `userId = ''` في useRealtimeAlerts
**الحكم: ✅ مؤكد** — سطر 24: `userId = user?.id ?? ''`. سطر 34: `if (ticket.created_by === userId) return;` — إذا userId = '' لن تُفلتَر tickets.

### ⚠️ #45 — ZATCA بدون Realtime
**الحكم: ⚠️ صحيح — ميزة مفقودة وليس bug**

### ⚠️ #46 — DEBOUNCE_MS ثابت
**الحكم: ⚠️ صحيح — أولوية منخفضة**

### ✅ #47 — `timerRef` بدون cleanup عند unmount
**الحكم: ✅ مؤكد** — لا يوجد `useEffect` cleanup لـ `timerRef` في `useDashboardRealtime.ts`. الـ timer قد ينفّذ بعد unmount.

### ✅ #48 — `Notification` name clash
**الحكم: ✅ مؤكد** — سطر 7: `import type { Notification }` + سطر 80: `window.Notification`. تعارض في القراءة.

### ✅ #49 — `AudioContext` بدون تفاعل مستخدم
**الحكم: ✅ مؤكد** — سطر 18 في `useNotificationActions.ts`: `new AudioContext()` عند أول إشعار Realtime بدون user gesture.

### ⚠️ #50 — `markAllAsRead` بدون limit
**الحكم: ⚠️ صحيح — خطر نظري** — عدد الإشعارات عادةً صغير.

### ✅ #51 — SQL injection potential في `deleteRead`
**الحكم: ✅ مؤكد** — سطر 47: `` `(${[...disabledTypes].join(',')})` `` بناء يدوي.
**ملاحظة:** `disabledTypes` تأتي من localStorage/UI — خطر injection حقيقي إذا عُدّلت يدوياً.

### ✅ #52 — `deviceName` بدون truncation
**الحكم: ✅ مؤكد** — سطر 110 في `useWebAuthn.ts`: `deviceName: deviceName || getDeviceName()` بدون `.slice()`.

### ❌ #53 — sidebar localStorage بدون debounce
**الحكم: ❌ ليس مشكلة** — toggle نادر جداً (مرة كل دقائق). localStorage.setItem سريع.

### ⚠️ #54 — themeObserver بدون cleanup مضمون
**الحكم: ⚠️ صحيح جزئياً** — `cleanupThemeObserver()` موجودة (سطر 59-62) لكن يجب التأكد من استدعائها.

### ❌ #55 — `getVolumeGain` تقرأ localStorage كل مرة
**الحكم: ❌ ليس مشكلة** — الإشعارات نادرة. localStorage synchronous وسريع (~1μs).

### ⚠️ #56 — `MAX_BACKOFF_MS = 30_000`
**الحكم: ⚠️ صحيح — تحسين ممكن** لكن ليس حرجاً.

### ❌ #57 — لا يوجد INSERT handler للعقود
**الحكم: ❌ خاطئ تماماً** — سطر 81-91 في `useRealtimeAlerts.ts` يحتوي على `event: 'INSERT', table: 'contracts'` handler ✅.

### ⚠️ #58 — `audioCtxRef` لا يُنظَّف عند logout
**الحكم: ⚠️ صحيح — خطر صفري فعلياً** — `AudioContext` خفيف.

### ⚠️ #59 — `exact: false` يُبطل queries كثيرة
**الحكم: ⚠️ مقصود** — سطر 46. التوثيق مطلوب لكن السلوك صحيح.

### ⚠️ #60 — `lastNotifIdRef` يحفظ آخر ID فقط
**الحكم: ⚠️ صحيح — خطر نظري** — إشعاران بنفس الثانية نادر.

---

## 🟢 المجموعة د — UX ونظافة الكود (#61–#100)

### ❌ #61 — themeObserver يعمل قبل login — **ليس مشكلة** (هوية المنتج)
### ✅ #62 — OscillatorNode بدون cleanup — **مؤكد** (سطور 52, 60, 69, 85 بدون `osc.onended`)
### 🔄 #63 — مكرر من #47
### ✅ #64 — `useUserManagement` ضخم (15+ states) — **مؤكد**
### ⚠️ #65 — destructuring مزدوج — **صحيح — تجميلي**
### ✅ #66 — emojis في logic — **مؤكد** — سطر 35
### ✅ #67 — `CONTRACT_STATUS_LABELS` مكرر — **مؤكد**
### ✅ #68–#72 — ملفات بدون اختبارات — **مؤكد** (zatcaService, nationalIdLogin, useBiometricAuth, useUserManagementData, useDashboardRealtime)
### ✅ #73 — `errorReporter` بدون retry — **مؤكد**
### ✅ #74 — `error_stack` كامل في localStorage — **مؤكد** — سطر 44 في `errorReporter.ts`
### ❌ #75 — `pwa_just_updated` لا يُقرأ — **خاطئ** — `PwaUpdateNotifier.tsx` يقرأها
### ✅ #76 — bytes محسوبة بـ `length` — **مؤكد** — سطر 11 في `storage.ts`
### ✅ #77 — `checkErrorLogQueue` side effect — **مؤكد** — سطر 64-65
### ⚠️ #78 — لا isError للـ pending advances — **صحيح — تحسين ممكن**
### ⚠️ #79 — `pendingAmount` بدون توثيق معادلة — **صحيح — تحسين ممكن**
### ✅ #80 — `data.error` بدون `getSafeErrorMessage` — **مؤكد** — سطر 55
### ✅ #81 — `window.Notification` بدون fallback title — **مؤكد** — سطر 84
### 🔄 #82 — مكرر من #7
### ✅ #83 — `showAll` اسم غامض — **مؤكد** — سطر 22 في `useLayoutState.ts`
### ✅ #84 — `SHOW_ALL_ROUTES` اسم مُضلّل — **مؤكد** — سطر 77 في `constants.ts`. الاسم يوحي بـ "إظهار كل المسارات" لكن المقصود "المسارات التي تدعم فلتر كل السنوات".
### ⚠️ #85 — barrel exports غير متسقة — **صحيح — تجميلي**
### 🔄 #86 — مكرر من #20
### 🔄 #87 — مكرر من #7/#17
### ⚠️ #88 — `extraKeys` تُبطل دائماً — **صحيح — مقصود**
### ✅ #89 — `deleteRead` بدون تأكيد — **مؤكد — تحسين UX**
### ⚠️ #90 — `STALE_MESSAGING` لقائمة المستخدمين — **صحيح — تحسين ممكن**
### 🔄 #91 — مكرر من #3
### 🔄 #92 — مكرر من #2
### 🔄 #93 — مكرر من #73
### ✅ #94 — `fetchCredentials` تُعيد `[]` عند خطأ بعد success — **مؤكد** — سطر 69-72
### ✅ #95 — `handleRegistrationError` retry بدون maxRetries — **مؤكد** — سطر 33 retryFn بدون حد
### ⚠️ #96 — fallback channel بدون cleanup — **صحيح جزئياً**
### ⚠️ #97 — `INITIAL_BACKOFF_MS = 1_000` — **تحسين ممكن**
### ✅ #98 — `handleSignOut` بدون try/finally — **مؤكد** — سطر 54-56
### ✅ #99–#100 — ملفات بدون اختبارات — **مؤكد**

---

## 📋 الأولويات الحقيقية بعد التحقق

### الأسبوع 1 — أمان وثبات (7 مهام):
1. **#20+#98** — `handleSignOut`: إضافة `.catch()` لـ logAccessEvent + `try/finally` لـ signOut/navigate
2. **#18** — إضافة `if (biometricLoading) return;` في `handleBiometricLogin`
3. **#51** — إصلاح SQL injection في `deleteRead` (استخدام array filter)
4. **#47** — إضافة cleanup لـ `timerRef` في `useDashboardRealtime`
5. **#4** — استبدال `'waqf_notification_sound'` بـ `STORAGE_KEYS.NOTIFICATION_SOUND`
6. **#3** — إضافة `NID_LOCKED_UNTIL` لـ `STORAGE_KEYS` (في sessionStorage)
7. **#44** — إصلاح guard: `if (userId && ticket.created_by === userId) return;`

### الأسبوع 2 — تنظيف وأداء (8 مهام):
8. **#7** — حذف `useBiometricAuth.ts` واستخدام `useWebAuthn().authenticateWithBiometric`
9. **#21** — `handleOnboard/handleProductionUpgrade` يستخدمان `zatcaService` functions
10. **#23** — تغيير `STALE_REALTIME` → `STALE_FINANCIAL` في `useBeneficiarySummary`
11. **#29** — إضافة `?? 0` لقيم yoy في `useDashboardSummary`
12. **#30** — إضافة error handling لـ `clearZatcaOtp`
13. **#31** — حذف `updated_at` من `saveZatcaSettings` parameter
14. **#34** — حذف `return data;` من `complianceCheck.onSuccess`
15. **#15** — إضافة invalidation لـ orphaned/unlinked في `useSetRoleMutation`

### الأسبوع 3 — تحسينات (10 مهام):
16. **#48** — إعادة تسمية `Notification` → `AppNotification`
17. **#52** — truncate `deviceName` بـ `.slice(0, 100)`
18. **#62** — إضافة `osc.onended` cleanup لـ AudioNode
19. **#74** — تشذيب `error_stack` قبل localStorage
20. **#76** — إصلاح حساب bytes (استخدام `* 2` أو `Blob`)
21. **#77** — فصل side effect من `checkErrorLogQueue`
22. **#80** — استخدام `getSafeErrorMessage()` في `useBeneficiarySummary`
23. **#81** — fallback title: `newNotif.title || 'إشعار جديد'`
24. **#83+#84** — إعادة تسمية `showAll` → `showAllYears` و `SHOW_ALL_ROUTES` → `ALL_YEARS_ROUTES`
25. **#95** — إضافة maxRetries counter لـ `handleRegistrationError`

### الشهر القادم — اختبارات ومعمارية:
26. **#64** — تقسيم `useUserManagement` (useUserDialogs + useUserFilters)
27. **#66+#67** — مركزة PRIORITY_LABELS و CONTRACT_STATUS_LABELS
28. **#68-#72, #99-#100** — إنشاء اختبارات للملفات الحرجة
29. **#89** — إضافة ConfirmDialog لـ deleteRead
30. **#6** — تمرير user لـ fetchCredentials بدل getUser مكرر

---

## ملخص النقاط الخاطئة (12)

| # | السبب |
|---|-------|
| #1 | ملف محمي لا يُعدَّل |
| #5 | `getUser()` مطلوب أمنياً (verify_jwt=false) |
| #9 | UX label وليس أمني |
| #13 | التصميم مقصود |
| #25 | الفحص مطلوب (verify_jwt=false) |
| #33 | `finally` موجود فعلاً |
| #35 | `fiscalYearLabel` لا يؤثر على البيانات |
| #42 | `useRef` ثابت بالتصميم |
| #53 | toggle نادر |
| #55 | overhead غير محسوس |
| #57 | INSERT handler موجود فعلاً |
| #75 | `PwaUpdateNotifier` يقرأها |

---

> ⚠️ **وضع Plan Mode — تحليل فقط بدون تعديل الكود.**
