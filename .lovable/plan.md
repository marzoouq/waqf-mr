# خطة تحسين الألوان الثابتة

## الملخص
استخراج الألوان الثابتة إلى ثوابت مسمّاة في 3 ملفات — إعادة هيكلة فقط بدون تغيير وظيفي.

## الخطوات

### 1. `src/utils/export/printDistributionReport.ts`
إضافة كائن `PRINT_COLORS` (27 لون) بعد سطر الاستيراد (سطر 5) مع تعليق عربي، ثم استبدال كل hex في CSS template string (سطور 70-107) وinline styles (سطور 153-167) بمراجع `${PRINT_COLORS.xxx}`.

### 2. `src/components/landing/LandingHero.tsx`
إضافة `const GOLD_PATTERN_COLOR = '#d4af37'` قبل interface (سطر 10)، واستبدال 4 مراجع `#d4af37` في SVG pattern (سطور 26-29) بـ `${GOLD_PATTERN_COLOR}`.

### 3. `src/components/invoices/InvoicePreviewDialog.tsx`
إضافة `const CANVAS_BG_COLOR = '#ffffff'` بعد imports (سطر 13)، واستبدال `'#ffffff'` في سطر 49 بـ `CANVAS_BG_COLOR`.

### 4. التحقق
`npx tsc --noEmit` — صفر أخطاء متوقعة.