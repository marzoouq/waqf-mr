

# خطة إصلاح — تنبيهات لوحة الناظر

## تصحيح التقرير

| البند في التقرير | الحالة الفعلية |
|---|---|
| `.env` مرفوع علناً | ❌ غير صحيح — مُدار تلقائياً من Lovable Cloud، المفاتيح عامة بالتصميم |
| `.gitignore` سطر مكرر | ❌ غير صحيح — الملف الحالي لا يحتوي أي تكرار |
| شريط Progress للتحصيل مفقود | ❌ غير صحيح — موجود في `CollectionSummaryCard.tsx` سطر 78 |
| تنبيه سُلف معلقة في الأعلى | ✅ مؤكد — `DashboardAlerts` لا تعرض عدد السُلف المعلقة |
| تنبيه تحصيل منخفض | ✅ مؤكد — لا يوجد تحذير عند نسبة تحصيل أقل من 50% |

## التغييرات المطلوبة (ملف واحد)

### `src/components/dashboard/DashboardAlerts.tsx`
- إضافة prop جديد `pendingAdvancesCount: number`
- إضافة تنبيه بصري عند `pendingAdvancesCount > 0`: "يوجد X طلب سُلفة معلق بانتظار الموافقة" مع زر "مراجعة" يوجه لصفحة الحسابات
- إضافة prop جديد `collectionRate: number`
- إضافة تنبيه تحذيري عند `collectionRate < 50 && collectionRate > 0`: "معدل التحصيل منخفض (X%) — يُنصح بمراجعة الفواتير المتأخرة" مع زر يوجه لصفحة العقود

### `src/pages/dashboard/AdminDashboard.tsx`
- تمرير `pendingAdvancesCount` و `collectionRate` كـ props لمكون `DashboardAlerts`

**إجمالي الملفات:** 2

