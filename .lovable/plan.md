# خطة تحسين الألوان الثابتة

## الملخص
استخراج الألوان الثابتة إلى ثوابت مسمّاة في 3 ملفات — إعادة هيكلة فقط بدون تغيير وظيفي.

---

## الخطوات

### 1. `src/utils/export/printDistributionReport.ts`
إضافة كائن `PRINT_COLORS` قبل الدوال يحتوي على كل الألوان المستخدمة في CSS template string (سطر 70-107) وفي inline styles (سطر 153-167):

```typescript
const PRINT_COLORS = {
  text: '#1a1a2e',
  background: '#fff',
  heading: '#2c3e50',
  subheading: '#7f8c8d',
  muted: '#95a5a6',
  metaBg: '#f8f9fa',
  metaBorder: '#e9ecef',
  tableBorder: '#dee2e6',
  tableHeaderBg: '#2c3e50',
  tableHeaderText: '#fff',
  evenRowBg: '#f8f9fa',
  totalRowBg: '#f1f3f5',
  success: '#27ae60',
  danger: '#c0392b',
  warning: '#e67e22',
  info: '#2980b9',
  deficitBg: '#fff5f5',
  primaryCardBg: '#e8f5e9',
  primaryCardBorder: '#a5d6a7',
  dangerCardBg: '#ffebee',
  dangerCardBorder: '#ef9a9a',
  warningCardBg: '#fff8e1',
  warningCardBorder: '#ffe082',
  infoCardBg: '#e3f2fd',
  infoCardBorder: '#90caf9',
  footerText: '#adb5bd',
  labelText: '#666',
} as const;
```

ثم استبدال كل hex في CSS template بـ `${PRINT_COLORS.xxx}`.

### 2. `src/components/landing/LandingHero.tsx`
إضافة `const GOLD_PATTERN_COLOR = '#d4af37';` قبل المكون، واستبدال الـ 4 مراجع في SVG pattern (سطور 26-29).

### 3. `src/components/invoices/InvoicePreviewDialog.tsx`
إضافة `const CANVAS_BG_COLOR = '#ffffff';` واستبدال المرجع في سطر 49.

### 4. التحقق
`npx tsc --noEmit` — صفر أخطاء متوقعة.