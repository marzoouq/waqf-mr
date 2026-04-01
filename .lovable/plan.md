

# خطة مُعتمدة: إصلاح 8 أخطاء بناء في ملفي barrel index

## التحقق الجنائي — النتائج

تم فحص **جميع الملفات المصدرية الـ 8** وتأكيد أن كل خطأ في الخطة مطابق للواقع:

| # | التصدير الخاطئ | الملف المصدري | التصديرات الفعلية | الحكم |
|---|---------------|--------------|-------------------|-------|
| 1 | `withNotify` | `mutationNotify.ts` | `defaultNotify`, `MutationNotify` (type) | حذف |
| 2 | `useAccessLog` | `useAccessLog.ts` | `logAccessEvent` فقط | حذف |
| 3 | `useAnnualReport` | `useAnnualReport.ts` | `useAnnualReportItems`, `useCreateReportItem`, `useUpdateReportItem`, `useDeleteReportItem`, `useReportStatus`, `useToggleReportPublish`, `useIncomeComparison` | تصحيح |
| 4 | `useCrudFactory` | `useCrudFactory.ts` | `createCrudFactory` | تصحيح |
| 5 | `useMessaging` | `useMessaging.ts` | `useConversations`, `useMessages`, `useSendMessage`, `useCreateConversation` | تصحيح |
| 6 | `useSecurityAlerts` | `useSecurityAlerts.ts` | `checkNewDeviceLogin` | تصحيح |
| 7 | `useDistribute` | `useDistribute.ts` | `useDistributeShares` | تصحيح |
| 8 | `usePropertyFinancials` | `usePropertyFinancials.ts` | `computePropertyFinancials` + `PropertyFinancials` (type) | تصحيح |

**فحص المستهلكين**: لا يوجد أي ملف يستورد من `@/hooks/data` أو `@/hooks/financial` (barrel) — جميع الاستيرادات مباشرة. لذلك التصحيح **آمن تماماً** ولن يكسر أي كود.

---

## الإصلاحات المطلوبة

### الملف 1: `src/hooks/data/index.ts`
- **السطر 1**: `{ defaultNotify, withNotify }` → `{ defaultNotify }` (حذف `withNotify`)
- **السطر 2**: `{ useAccessLog, logAccessEvent }` → `{ logAccessEvent }` (حذف `useAccessLog`)
- **السطر 4**: `{ useAnnualReport }` → `{ useAnnualReportItems, useCreateReportItem, useUpdateReportItem, useDeleteReportItem, useReportStatus, useToggleReportPublish, useIncomeComparison }`
- **السطر 9**: `{ useCrudFactory }` → `{ createCrudFactory }`
- **السطر 14**: `{ useMessaging }` → `{ useConversations, useMessages, useSendMessage, useCreateConversation }`
- **السطر 23**: `{ useSecurityAlerts }` → `{ checkNewDeviceLogin }`

### الملف 2: `src/hooks/financial/index.ts`
- **السطر 22**: `{ useDistribute }` → `{ useDistributeShares }`
- **السطر 28**: `{ usePropertyFinancials }` → `{ computePropertyFinancials }` + إضافة `export type { PropertyFinancials }`

---

## تقييم المخاطر

- **احتمال كسر كود قائم**: صفر (لا مستهلك يستورد من barrel)
- **تأثير على الأداء**: لا يوجد
- **آثار جانبية**: لا يوجد — هذه تصحيحات تصدير فقط
- **النتيجة المتوقعة**: إزالة جميع أخطاء البناء الـ 8 واستعادة المعاينة

