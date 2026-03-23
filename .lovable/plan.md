

# تصنيف hooks في مجلدات فرعية

## التحدي

80+ ملف hook في مجلد مسطح واحد، مستورد في **118 ملف** عبر المشروع. إعادة التنظيم تتطلب تحديث جميع مسارات الاستيراد.

## التصنيف المقترح

```text
src/hooks/
├── index.ts                    ← barrel re-export (يحافظ على التوافق)
├── data/
│   ├── useProperties.ts
│   ├── useContracts.ts
│   ├── useUnits.ts
│   ├── useIncome.ts
│   ├── useExpenses.ts
│   ├── useInvoices.ts
│   ├── usePaymentInvoices.ts
│   ├── useBeneficiaries.ts
│   ├── useMessaging.ts
│   ├── useSupportTickets.ts
│   ├── useAuditLog.ts
│   ├── useAccessLog.ts
│   ├── useBylaws.ts
│   ├── useAnnualReport.ts
│   ├── useNotifications.ts
│   ├── useNotificationPreferences.ts
│   ├── usePushNotifications.ts
│   ├── useRealtimeAlerts.ts
│   ├── useSecurityAlerts.ts
│   ├── useTenantPayments.ts
│   ├── useWaqfInfo.ts (إن وُجد)
│   ├── usePdfWaqfInfo.ts
│   ├── useAccountCategories.ts
│   └── useCrudFactory.ts
├── financial/
│   ├── useAccounts.ts
│   ├── useAccountsPage.ts
│   ├── useAccountsActions.ts
│   ├── useAccountsCalculations.ts
│   ├── useAccountsData.ts
│   ├── useAccountsEditing.ts
│   ├── useFinancialSummary.ts
│   ├── useRawFinancialData.ts
│   ├── useComputedFinancials.ts
│   ├── usePropertyFinancials.ts
│   ├── useContractAllocations.ts
│   ├── useFiscalYears.ts
│   ├── useDistribute.ts
│   ├── useMyShare.ts
│   ├── useMySharePage.ts
│   ├── useAdvanceRequests.ts
│   ├── useTotalBeneficiaryPercentage.ts
│   ├── useYoYComparison.ts
│   └── usePrefetchAccounts.ts
├── ui/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useIdleTimeout.ts
│   ├── usePagePerformance.ts
│   ├── useDashboardRealtime.ts
│   ├── useBfcacheSafeChannel.ts
│   └── useUnreadMessages.ts
├── auth/
│   ├── useAuthContext.ts
│   ├── useWebAuthn.ts
│   └── useUserManagement.ts
├── page/
│   └── useBeneficiaryDashboardData.ts
│   └── useAppSettings.ts
```

## الاستراتيجية: Barrel Re-exports

بدلاً من تحديث 118+ ملف يدوياً (خطر كبير)، ننشئ **ملف barrel export** في `src/hooks/index.ts` يعيد تصدير كل شيء من المجلدات الفرعية. ثم ننشئ ملفات **proxy** في المواقع القديمة:

```typescript
// src/hooks/useProperties.ts (يبقى كملف proxy)
export * from './data/useProperties';
```

هذا يضمن:
1. **لا تعطّل** — جميع الاستيرادات القديمة تعمل فوراً
2. **تنظيم فعلي** — الكود الحقيقي في المجلدات الفرعية
3. **تدريجي** — يمكن تحديث الاستيرادات لاحقاً ملف بملف

## خطوات التنفيذ

| الخطوة | الوصف | الملفات |
|--------|-------|---------|
| 1 | إنشاء 5 مجلدات فرعية | `data/`, `financial/`, `ui/`, `auth/`, `page/` |
| 2 | نقل كل hook لمجلده (الملف الأصلي يصبح proxy re-export) | ~45 hook (بدون ملفات الاختبار) |
| 3 | ملفات الاختبار تبقى بجانب الـ proxy (أو تُنقل مع الأصل) | ~35 ملف اختبار |
| 4 | تحديث الاستيرادات الداخلية بين hooks (مثل `useAccountsActions` يستورد من `useAccounts`) | ~10 ملفات |

## ملاحظات

- **`use-mobile.tsx`** و **`use-toast.ts`** يبقيان بأسمائهم الحالية (kebab-case) لأنهما مستخدمان في مكونات UI أساسية (`sidebar.tsx`, `toaster.tsx`, `AuthContext.tsx`)
- ملفات الاختبار تُنقل مع ملفاتها الأصلية للمجلدات الفرعية
- الملفات الـ proxy تكون سطر واحد فقط: `export * from './subfolder/fileName'`

## عدد الملفات

- **~45 ملف hook** تُنقل فعلياً
- **~35 ملف اختبار** تُنقل معها
- **~45 ملف proxy** تُنشأ في المواقع القديمة
- **0 ملفات خارجية تُعدّل** (بفضل الـ proxy)

