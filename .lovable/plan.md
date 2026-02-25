
# إضافة تقرير PDF لتوزيعات الحصص

## الهدف
إنشاء تقرير PDF تفصيلي يعرض توزيعات حصص المستفيدين، متضمناً: الحصة المستحقة، السُلف المصروفة، الفروق المرحّلة، وصافي التوزيع لكل مستفيد.

## التغييرات المطلوبة

### 1. إنشاء دالة توليد PDF جديدة
**ملف جديد: لا** -- سيتم إضافة الدالة في `src/utils/pdf/accounts.ts`

دالة `generateDistributionsPDF` ستتضمن:
- ترويسة رسمية بشعار الوقف (نفس النمط المستخدم في باقي التقارير)
- عنوان "تقرير توزيع الحصص" مع اسم السنة المالية
- **ملخص مالي**: المبلغ المتاح للتوزيع، إجمالي السُلف، إجمالي المرحّل، صافي التوزيع
- **جدول تفصيلي** بأعمدة: المستفيد | النسبة | الحصة | السُلف | المرحّل | الصافي | الفرق المرحّل
- **صف إجمالي** في أسفل الجدول
- تنبيه بصري في حال وجود فروق مرحّلة
- تذييل رسمي بختم الوقف

### 2. تصدير الدالة من ملف الفهرس
**ملف: `src/utils/pdf/index.ts`**
إضافة `generateDistributionsPDF` إلى قائمة التصدير.

### 3. إضافة زر التصدير في نافذة التوزيع
**ملف: `src/components/accounts/DistributeDialog.tsx`**
إضافة زر "تصدير PDF" في أسفل النافذة بجانب أزرار التأكيد والإلغاء، يقوم بتوليد التقرير بناءً على البيانات المعروضة حالياً.

## التفاصيل التقنية

### هيكل بيانات الدالة الجديدة:
```typescript
generateDistributionsPDF(data: {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: Array<{
    beneficiary_name: string;
    share_percentage: number;
    share_amount: number;
    advances_paid: number;
    carryforward_deducted: number;
    net_amount: number;
    deficit: number;
  }>;
}, waqfInfo?: PdfWaqfInfo)
```

### تصميم الجدول:
- رؤوس الأعمدة بلون ذهبي (TABLE_HEAD_GOLD) لتمييزه عن باقي التقارير
- صفوف المستفيدين ذوي الفروق المرحّلة بخلفية مميزة
- صف الإجمالي بلون أخضر (TABLE_HEAD_GREEN)

### الملفات المتأثرة:

| الملف | التغيير |
|-------|---------|
| `src/utils/pdf/accounts.ts` | إضافة دالة `generateDistributionsPDF` |
| `src/utils/pdf/index.ts` | تصدير الدالة الجديدة |
| `src/components/accounts/DistributeDialog.tsx` | إضافة زر تصدير PDF + استخدام `usePdfWaqfInfo` |
