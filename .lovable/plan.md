# فحص لوحة التحكم — تحذيرات React/Charts

## نتائج المسح

فحصت كل صفحات `/dashboard/*` (35 صفحة) وكل مكوّنات الرسوم البيانية:

### ✅ سليم
- **كل `ResponsiveContainer`** (14 موقع: dashboard, reports, expenses, waqif, annual-report) ملفوف بـ `ChartBox` أو `useChartReady` — لا تحذيرات `width(-1)` متوقعة بعد إصلاح `useChartReady` الأخير.
- **لا توجد مشاكل Recharts** أخرى في الصفحات الأخرى.

### ⚠️ مصدر واحد لتحذير `React.Fragment data-state`
- **`src/components/expenses/ExpensesDesktopTable.tsx:58,93`** — هذا هو المصدر الوحيد في كل الكود. تحذيراته الأربعة في console نشأت من 4 صفوف مصروفات تُعرض على `/dashboard/expenses`.
- لا توجد حالات Fragment مشابهة في صفحات أخرى.
- ملاحظة: `src/test/setup.ts:10` يقمع هذا التحذير في الاختبارات فقط — لكنه يظهر في dev console.

## خطة الإصلاح

### تعديل واحد فقط: `ExpensesDesktopTable.tsx`

تحويل التركيب من `React.Fragment` (الذي لا يقبل `data-state` الذي تمرره Radix tooltip/أي wrapper أعلى الشجرة) إلى مصفوفة `<TableRow>`s مع مفاتيح مستقلة:

```tsx
{items.flatMap((item) => {
  const attachCount = expenseInvoiceMap.get(item.id) || 0;
  const isExpanded = expandedRow === item.id;
  const rows = [
    <TableRow key={`${item.id}-main`} className={isExpanded ? 'border-b-0' : ''}>
      {/* … محتوى الصف الحالي … */}
    </TableRow>,
  ];
  if (isExpanded) {
    rows.push(
      <TableRow key={`${item.id}-expand`}>
        <TableCell colSpan={7} className="bg-muted/30 p-3 border-b">
          <ExpenseAttachments expenseId={item.id} />
        </TableCell>
      </TableRow>
    );
  }
  return rows;
})}
```

ثم إزالة `import React` إذا لم يعد مستخدماً.

## التحقق

1. إعادة تحميل `/dashboard/expenses` وتوسعة عدة صفوف.
2. `read_console_logs` — يجب اختفاء الأربع تحذيرات `Invalid prop data-state supplied to React.Fragment`.
3. تنقّل سريع عبر `/dashboard/contracts`, `/properties`, `/income`, `/beneficiaries`, `/reports` للتأكد من عدم ظهور تحذيرات Recharts أو Fragment جديدة.

## النطاق

- ملف واحد فقط، ~10 أسطر تغيير.
- لا تغييرات في منطق الأعمال أو الـ hooks أو الـ styles.
- لا تأثير على الاختبارات (test setup يقمع الرسالة أصلاً).
