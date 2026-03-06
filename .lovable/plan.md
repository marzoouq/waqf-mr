

# خطة: استبدال نصوص التحميل بـ Skeleton Loaders في 5 صفحات

## التغييرات

كل صفحة تحتاج تغيير سطر واحد — استبدال `<div className="text-center py-12"><p>جاري التحميل...</p></div>` بمكون Skeleton مناسب من `@/components/SkeletonLoaders`.

### 1. `PropertiesPage.tsx` (سطر 179)
- العقارات تُعرض كـ cards في grid → استخدام `StatsGridSkeleton count={6}`
- إضافة استيراد `StatsGridSkeleton`

### 2. `ExpensesPage.tsx` (سطر 131)
- جدول مصروفات → استخدام `TableSkeleton rows={5} cols={5}`
- إضافة استيراد `TableSkeleton`

### 3. `InvoicesPage.tsx` (سطر 342)
- جدول فواتير → استخدام `TableSkeleton rows={5} cols={5}`
- إضافة استيراد `TableSkeleton`

### 4. `ContractsPage.tsx` (سطر 349)
- جدول عقود → استخدام `TableSkeleton rows={5} cols={6}`
- إضافة استيراد `TableSkeleton`

### 5. `AuditLogPage.tsx` (سطر 281)
- جدول سجلات → استخدام `TableSkeleton rows={5} cols={4}`
- إضافة استيراد `TableSkeleton`

## الملفات المتأثرة: 5 ملفات، تغيير بسيط في كل منها (إضافة استيراد + استبدال سطر واحد)

