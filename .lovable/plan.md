

# خطة دمج الهوكات المكررة (Re-export Shims)

## المشكلة
يوجد **6 ملفات إعادة تصدير (shims)** في `hooks/page/` و `hooks/ui/` تُعيد تصدير هوكات من `hooks/data/` دون إضافة أي منطق. هذا يُنشئ طبقة غير ضرورية ويُعقّد التتبع.

## الملفات المكررة والمستهلكون

| ملف Shim | المصدر الأصلي | عدد المستهلكين |
|---|---|---|
| `page/useAppSettings.ts` | `data/useAppSettings` | **28 ملف** |
| `page/useBeneficiaryDashboardData.ts` | `data/useBeneficiaryDashboardData` | 5 ملفات |
| `page/useDashboardSummary.ts` | `data/useDashboardSummary` | 1 ملف |
| `page/useZatcaManagement.ts` | `data/useZatcaManagement` | 1 ملف |
| `page/useCollectionAlerts.ts` | `data/useCollectionAlerts` | 1 ملف |
| `ui/useUnreadMessages.ts` | `data/useUnreadMessages` | 2 ملفات |

## خطة التنفيذ

### الخطوة 1: تحديث الاستيرادات في جميع المستهلكين (~38 ملف)
تغيير كل `from '@/hooks/page/useAppSettings'` إلى `from '@/hooks/data/useAppSettings'` وهكذا لبقية الـ 5 shims.

### الخطوة 2: حذف ملفات الـ Shim الستة
حذف الملفات التالية بعد تحديث جميع المستهلكين:
- `src/hooks/page/useAppSettings.ts`
- `src/hooks/page/useBeneficiaryDashboardData.ts`
- `src/hooks/page/useDashboardSummary.ts`
- `src/hooks/page/useZatcaManagement.ts`
- `src/hooks/page/useCollectionAlerts.ts`
- `src/hooks/ui/useUnreadMessages.ts`

### الخطوة 3: التحقق
- `npx tsc --noEmit` للتأكد من عدم وجود أخطاء

## ملاحظة
لم أجد تكرارات منطقية فعلية (هوكات بنفس الكود) — فقط طبقات إعادة تصدير للتوافق الخلفي.

