

# خطة تنفيذ تحسينات الجولة الخامسة

## الملخص
4 إجراءات على 7 ملفات — حذف كود ميت + توحيد تصديرات barrel file.

---

## الخطوات

### 1. حذف `useBeneficiarySummary` (كود ميت)
- حذف ملف `src/hooks/data/financial/useBeneficiarySummary.ts`
- إزالة سطر التصدير (السطر 10) من `src/hooks/data/financial/index.ts`

### 2. حذف `useRealtimeAlerts` (كود ميت)
- حذف ملف `src/hooks/data/notifications/useRealtimeAlerts.ts`
- حذف ملف الاختبار `src/hooks/data/notifications/useRealtimeAlerts.test.ts`
- إزالة سطر التصدير (السطر 6) من `src/hooks/data/notifications/index.ts`

### 3. إكمال barrel file لـ `src/utils/format/index.ts`
إضافة 4 تصديرات مفقودة:
- `toGregorianShort` من `./date`
- `maskPhone`, `maskEmail` من `./maskData`
- `safePercent` من `./safeNumber`

### 4. حذف `useSecurityAlerts.ts` (re-export shim غير مستهلك)
- حذف ملف `src/hooks/data/audit/useSecurityAlerts.ts`
- إزالة سطر التصدير (السطر 11) من `src/hooks/data/audit/index.ts`
- لا حاجة لتحديث أي مستهلك — `AuthContext` يستورد مباشرة من `securityService`

### 5. التحقق
- `npx tsc --noEmit` للتأكد من صفر أخطاء

---

## التفاصيل التقنية

| الإجراء | ملفات محذوفة | ملفات معدّلة |
|---------|-------------|-------------|
| حذف useBeneficiarySummary | 1 | 1 (barrel) |
| حذف useRealtimeAlerts | 2 (+ test) | 1 (barrel) |
| إكمال format barrel | 0 | 1 |
| حذف useSecurityAlerts | 1 | 1 (barrel) |
| **المجموع** | **4** | **4** |

صفر تأثير وظيفي — كل الملفات المحذوفة غير مستهلكة.

