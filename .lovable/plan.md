

# تحليل أحجام الـ Chunks — النتائج والتوصيات

## النتائج من فحص البناء الإنتاجي (Production)

تم فحص الموقع المنشور `waqf-wise-net.lovable.app` وقياس أحجام الملفات المحمّلة:

### أحجام الـ Chunks (مضغوطة gzip — حجم النقل الفعلي)

| Chunk | الحجم المضغوط | ملاحظة |
|-------|--------------|--------|
| `vendor-pdf` | **186KB** | الأكبر — jsPDF + canvg + rgbcolor |
| `vendor-react` | 60KB | React + ReactDOM |
| `vendor-radix` | 52KB | مكونات Radix UI |
| `vendor-supabase` | 50KB | Supabase client |
| `index` (التطبيق) | ~40KB | الكود الرئيسي |
| `vendor-icons` | ~30KB | Lucide icons |
| `vendor-router` | ~20KB | React Router |
| `vendor-query` | ~15KB | TanStack Query |
| `vendor-sonner` | ~8KB | Toast |
| `vendor-ui-utils` | ~10KB | CVA + clsx + cmdk |

**إجمالي JS المحمّل عند الصفحة الأولى: ~436KB (مضغوط)**

### الحجم غير المضغوط (تقدير)

حد التحذير في `vite.config.ts` هو `300KB` (غير مضغوط). بناءً على نسب الضغط المعتادة:
- `vendor-pdf` ≈ **500-600KB غير مضغوط** — **يتجاوز الحد** ⚠️
- باقي الـ chunks جميعها تحت 300KB غير مضغوط ✅

## المشكلة الرئيسية: vendor-pdf يُحمّل بشكل مبكر

`vendor-pdf` (أكبر chunk) يُحمّل **مع الصفحة الأولى** رغم أن PDF لا يُستخدم إلا عند الضغط على زر تصدير. السبب:

1. `src/utils/pdf/index.ts` (barrel file) يُصدّر من جميع ملفات PDF
2. ملفات مثل `paymentInvoice.ts`، `comprehensiveBeneficiary.ts`، `paymentInvoiceShared.ts` تستخدم `import jsPDF from 'jspdf'` (static import)
3. أي صفحة تستورد دالة واحدة من `@/utils/pdf` تسحب jsPDF بالكامل

**ملاحظة:** دالة `createPdfDocument` في `core.ts` تستخدم `await import('jspdf')` (dynamic) بشكل صحيح ✅، لكن 5 ملفات أخرى تستخدم static import.

## الحل المقترح

تحويل جميع الاستيرادات الثابتة لـ jsPDF إلى استيرادات ديناميكية في 5 ملفات:

| الملف | التغيير |
|-------|---------|
| `paymentInvoice.ts` | `import jsPDF from 'jspdf'` → `const { default: jsPDF } = await import('jspdf')` داخل الدالة |
| `paymentInvoiceShared.ts` | نفس التغيير |
| `paymentInvoiceProfessional.ts` | نفس التغيير |
| `paymentInvoiceCompact.ts` | نفس التغيير |
| `paymentInvoiceClassic.ts` | نفس التغيير |
| `comprehensiveBeneficiary.ts` | `import { jsPDF } from 'jspdf'` → dynamic import |

هذا سيمنع تحميل `vendor-pdf` (~186KB gzip / ~500KB raw) حتى يطلب المستخدم فعلياً تصدير PDF، مما يُحسّن وقت التحميل الأوّلي بشكل ملحوظ.

