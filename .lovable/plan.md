

# خطة تنفيذ نتائج الدورة الثالثة — 21 مهمة مؤكدة

## التحقق الجنائي

تم التحقق من كل الملفات المذكورة. جميع النقاط الـ 21 **مؤكدة بالكود الفعلي**:

- **#20+#98**: `useLayoutState.ts` سطر 54-56 — `await logAccessEvent(...)` ثم `await signOut()` بدون catch/finally
- **#18**: `useBiometricAuth.ts` سطر 14 — لا guard ضد double-submit
- **#51**: `useNotificationActions.ts` سطر 47 — string concatenation لبناء SQL filter
- **#47**: `useDashboardRealtime.ts` — لا cleanup لـ `timerRef` عند unmount
- **#15**: `useUserManagementMutations.ts` سطر 70 — `setRole` يُبطل `admin-users` فقط
- **#7**: `useBiometricAuth.ts` يكرر `useWebAuthn.authenticateWithBiometric` بالكامل
- **#4**: `useNotificationActions.ts` سطر 78 — `'waqf_notification_sound'` hardcoded
- **#3**: `nationalIdLogin.ts` سطر 64 — `'nidLockedUntil'` hardcoded
- **#30**: `zatcaService.ts` سطر 26 — `clearZatcaOtp` بدون error handling
- **#31**: `zatcaService.ts` سطر 29 — `updated_at` من العميل
- **#21**: `useZatcaManagement.ts` سطر 158+ يكرر `zatcaService.zatcaOnboard`
- **#23**: `useBeneficiarySummary.ts` سطر 45 — `STALE_REALTIME` لـ Edge Function
- **#34**: `useZatcaManagement.ts` سطر 152 — `return data` في onSuccess
- **#29**: `useDashboardSummary.ts` سطر 189 — `y.prev_income` بدون `?? 0`
- **#41**: `useDashboardRealtime.ts` سطر 28,33 — `JSON.stringify` بدون `useMemo`
- **#44**: `useRealtimeAlerts.ts` سطر 34 — `ticket.created_by === userId` بدون guard لـ `''`
- **#48**: `useNotificationActions.ts` سطر 7,76 — `Notification` type يتعارض مع Web API
- **#52**: `useWebAuthn.ts` سطر 110 — `deviceName` بدون truncation
- **#95**: `useWebAuthn.ts` سطر 125 — `handleRegistrationError(err, () => registerBiometric(...))` بدون maxRetries
- **#25**: `useInvoices.ts` سطر 147 — `getUser()` زائد في mutationFn
- **#6**: `useWebAuthn.ts` سطر 59,83 — `getUser()` مرتين في registerBiometric

---

## الأسبوع 1 — أمان حرج (6 مهام)

### 1. إصلاح `handleSignOut` (#20+#98)
**ملف:** `src/hooks/ui/useLayoutState.ts`
```typescript
const handleSignOut = useCallback(async () => {
  setLogoutOpen(false);
  setMobileSidebarOpen(false);
  await logAccessEvent({ event_type: 'logout', user_id: user?.id }).catch(() => {});
  try { await signOut(); } finally { navigate('/auth', { replace: true }); }
}, [navigate, signOut, user?.id]);
```

### 2. Double-submit guard (#18)
**ملف:** `src/hooks/auth/useBiometricAuth.ts`
إضافة `if (biometricLoading) return;` كأول سطر في `handleBiometricLogin`.

### 3. إصلاح SQL injection في `deleteRead` (#51)
**ملف:** `src/hooks/data/notifications/useNotificationActions.ts` — سطر 47
استبدال `\`(${[...disabledTypes].join(',')})\`` بمصفوفة Supabase filter مناسبة.

### 4. Cleanup لـ `timerRef` (#47)
**ملف:** `src/hooks/ui/useDashboardRealtime.ts`
إضافة `useEffect` cleanup يُلغي timer عند unmount.

### 5. إضافة invalidation في `useSetRoleMutation` (#15)
**ملف:** `src/hooks/auth/useUserManagementMutations.ts` — سطر 70
إضافة invalidation لـ `orphaned-beneficiaries` و`unlinked-beneficiaries`.

### 6. حذف `useBiometricAuth` وتوحيده مع `useWebAuthn` (#7)
- تحديث `BiometricLoginButton.tsx` لاستخدام `useWebAuthn().authenticateWithBiometric` مباشرة
- حذف `src/hooks/auth/useBiometricAuth.ts`

---

## الأسبوع 2 — تنظيف وأداء (9 مهام)

### 7. إصلاح hardcoded storage key (#4)
**ملف:** `useNotificationActions.ts` سطر 78 — استبدال `'waqf_notification_sound'` بـ `STORAGE_KEYS.NOTIFICATION_SOUND`

### 8. إضافة `NID_LOCKED_UNTIL` لـ `STORAGE_KEYS` (#3)
**ملف:** `storageKeys.ts` + `nationalIdLogin.ts`

### 9. Error handling لـ `clearZatcaOtp` (#30)
**ملف:** `zatcaService.ts` — فحص error وتسجيله بـ logger

### 10. حذف `updated_at` من `saveZatcaSettings` (#31)
**ملف:** `zatcaService.ts` — تغيير type إلى `{ key: string; value: string }` فقط

### 11. توحيد `handleOnboard` مع service (#21)
**ملف:** `useZatcaManagement.ts` — استدعاء `zatcaOnboard()` من `zatcaService`

### 12. تغيير `STALE_REALTIME` → `STALE_FINANCIAL` (#23)
**ملف:** `useBeneficiarySummary.ts` سطر 45

### 13. حذف `return data` من onSuccess (#34)
**ملف:** `useZatcaManagement.ts` سطر 152

### 14. إضافة `?? 0` لقيم `yoy` (#29)
**ملف:** `useDashboardSummary.ts` سطر 189-191

### 15. تغليف بـ `useMemo` (#41)
**ملف:** `useDashboardRealtime.ts` سطور 28,33

---

## الأسبوع 3 — تحسينات (6 مهام)

### 16. إصلاح guard userId (#44)
**ملف:** `useRealtimeAlerts.ts` سطر 34 — `if (userId && ticket.created_by === userId) return;`

### 17. إعادة تسمية Notification type (#48)
**ملف:** `useNotificationActions.ts` — تعريف `AppNotification` واستخدامه

### 18. Truncate deviceName (#52)
**ملف:** `useWebAuthn.ts` سطر 110 — `.slice(0, 100)`

### 19. maxRetries لـ `handleRegistrationError` (#95)
**ملف:** `webAuthnErrors.ts` + `useWebAuthn.ts` — إضافة counter يمنع recursion لانهائي

### 20. إزالة `getUser()` الزائد (#25)
**ملف:** `useInvoices.ts` سطور 147-148 — Edge Function تحمي بـ JWT تلقائياً

### 21. تمرير user لـ fetchCredentials (#6)
**ملف:** `useWebAuthn.ts` — تعديل `fetchCredentials` لقبول `userId` parameter اختياري

---

## ملخص التأثير

| الأسبوع | الملفات | خطر الكسر |
|---------|---------|----------|
| 1 | 6 ملفات (حذف 1) | منخفض — نفس API الخارجي |
| 2 | 7 ملفات | صفر — تغييرات داخلية |
| 3 | 4 ملفات | صفر — تحسينات دفاعية |

**17 ملف متأثر، صفر كسر متوقع، تحسين كبير في الأمان والاستقرار.**

