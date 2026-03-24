

# خطة الإصلاح — إضافة فلتر التاريخ لسجل المراجعة

## الوضع الحالي

- **Rate limiting لـ AI assistant:** ✅ **مُنفَّذ فعلاً** — سطر 68-86 في `ai-assistant/index.ts` يستخدم `check_rate_limit` بحد 30 طلب/دقيقة لكل مستخدم. لا حاجة لأي تعديل.
- **فلتر التاريخ في سجل المراجعة:** ❌ **مفقود** — الفلاتر الحالية: جدول + عملية + بحث نصي فقط.

## التعديلات المطلوبة (فلتر تاريخ لسجل المراجعة)

### 1. `src/hooks/data/useAuditLog.ts`
- إضافة `dateFrom` و `dateTo` للـ filters interface
- إضافة `.gte('created_at', dateFrom)` و `.lte('created_at', dateTo + 'T23:59:59')` للاستعلام
- إضافة المتغيرين الجديدين لـ `queryKey`

### 2. `src/pages/dashboard/AuditLogPage.tsx`
- إضافة state: `dateFrom` و `dateTo` (strings)
- إضافة حقلي `<Input type="date" />` في شريط الفلاتر بجانب الفلاتر الحالية
- تمرير `dateFrom` و `dateTo` لـ `useAuditLog`
- إضافة زر "مسح الفلاتر" عند وجود فلتر تاريخ نشط
- تمرير فلاتر التاريخ لاستعلام التصدير أيضاً
- إعادة `currentPage` لـ 1 عند تغيير التاريخ

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `src/hooks/data/useAuditLog.ts` | إضافة `dateFrom`/`dateTo` للفلاتر والاستعلام |
| `src/pages/dashboard/AuditLogPage.tsx` | إضافة حقول تاريخ + ربطها بالهوك + التصدير |

