

# خطة الإصلاح المعماري — الجولة 4

## التحقق من الادعاءات

جميع الادعاءات الخمسة **مؤكدة** بعد فحص الكود الفعلي:

| # | الادعاء | النتيجة |
|---|---------|--------|
| 1 | `logAccessEvent` يُستورد من re-export في 10 ملفات | ✅ مؤكد — 10 ملفات تستورد من `@/hooks/data/audit/useAccessLog` |
| 2 | `useRoleRedirect` في `hooks/ui/` | ✅ مؤكد — مستخدم فقط من `useAuthPage.ts` |
| 3 | بحث AccessLog على الصفحة فقط | ✅ مؤكد — `logs.filter()` على المصفوفة المحمّلة في كلا الملفين |
| 4 | `useBfcacheSafeChannel` في `hooks/ui/` | ✅ مؤكد — 5 مستوردين، يعتمد على `lib/realtime/channelFactory` |
| 5 | `fiscalYearIds` خارج barrel | ✅ مؤكد — `constants/index.ts` لا يحتويه |

---

## الخطوات

### الخطوة 1: توحيد استيراد `logAccessEvent` 🟠

تحديث 10 ملفات لاستيراد مباشر من `@/lib/services/accessLogService` بدلاً من `@/hooks/data/audit/useAccessLog`. ثم حذف ملف `useAccessLog.ts` (bridge).

| ملف | إجراء |
|-----|-------|
| `src/contexts/AuthContext.tsx` | تعديل import |
| `src/components/auth/ProtectedRoute.tsx` | تعديل import |
| `src/components/auth/LoginForm.tsx` | تعديل import |
| `src/components/settings/PermissionsControlPanel.tsx` | تعديل import |
| `src/components/layout/IdleTimeoutManager.tsx` | تعديل import |
| `src/hooks/page/shared/useAuthPage.ts` | تعديل import |
| `src/hooks/page/admin/settings/useSystemDiagnostics.ts` | تعديل import |
| `src/hooks/ui/useLayoutState.ts` | تعديل import |
| `src/hooks/auth/webAuthnErrors.ts` | تعديل import |
| `src/lib/auth/nationalIdLogin.ts` | تعديل import |
| `src/hooks/data/audit/useAccessLog.ts` | حذف |

---

### الخطوة 2: نقل `useRoleRedirect` إلى `hooks/auth/` 🟠

| ملف | إجراء |
|-----|-------|
| `src/hooks/ui/useRoleRedirect.ts` → `src/hooks/auth/useRoleRedirect.ts` | نقل |
| `src/hooks/page/shared/useAuthPage.ts` | تعديل import |
| `src/hooks/auth/index.ts` | إضافة تصدير |

---

### الخطوة 3: إصلاح بحث AccessLog/ArchiveLog 🟡

إضافة توضيح نصي بجانب صندوق البحث يوضح أن البحث محدود بالصفحة الحالية. هذا الحل الأخف — تحويل البحث لاستعلام قاعدة بيانات يتطلب تغييرات أكبر في hooks البيانات.

| ملف | إجراء |
|-----|-------|
| `src/components/audit/AccessLogTab.tsx` | إضافة tooltip/نص توضيحي |
| `src/components/audit/ArchiveLogTab.tsx` | إضافة tooltip/نص توضيحي |

---

### الخطوة 4: نقل `useBfcacheSafeChannel` إلى `lib/realtime/` 🟡

| ملف | إجراء |
|-----|-------|
| `src/hooks/ui/useBfcacheSafeChannel.ts` → `src/lib/realtime/bfcacheSafeChannel.ts` | نقل |
| `src/hooks/ui/useDashboardRealtime.ts` | تعديل import |
| `src/hooks/page/beneficiary/useBeneficiaryDashboardPage.ts` | تعديل import |
| `src/hooks/data/notifications/useNotificationActions.ts` | تعديل import |
| `src/hooks/data/messaging/useMessaging.ts` | تعديل import |
| `src/hooks/ui/useRealtimeAlerts.ts` | تعديل import |
| `src/hooks/ui/index.ts` | إزالة تصدير |

---

### الخطوة 5: إضافة `fiscalYearIds` لـ barrel 🟢

| ملف | إجراء |
|-----|-------|
| `src/constants/index.ts` | إضافة تصدير |

---

## ملخص التأثير

| الخطوة | نقل | حذف | تعديل |
|--------|-----|-----|-------|
| 1 | 0 | 1 | 10 |
| 2 | 1 | 0 | 2 |
| 3 | 0 | 0 | 2 |
| 4 | 1 | 0 | 6 |
| 5 | 0 | 0 | 1 |
| **المجموع** | **2** | **1** | **21** |

صفر تغيير في السلوك الخارجي.

