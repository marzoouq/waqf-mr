# تفعيل اختبارات صحة مستندات PDF للتقارير الثلاثة

## الهدف

الاختبارات الحالية في `src/utils/pdf/**/*.test.ts` تستخدم **mocks كاملة لـ jsPDF** — تتحقق فقط أن الدوال تُستدعى، لا أن المخرج PDF صالح. سنضيف طبقة اختبار تكاملية ثانية **بدون mocking لـ jsPDF**، تُمرّر التدفق الكامل: زر → handler → `generate*PDF` → ملف PDF حقيقي، ثم نتحقق أن المخرج مستند PDF صالح وقابل للقراءة.

## ما يُضاف

ملف جديد واحد:
```
src/test/pdfReportsIntegration.test.ts
```

يغطي ثلاثة سيناريوهات نهائية مطلوبة من المستخدم:

| التقرير | المُولِّد | Handler |
|--------|---------|---------|
| الإفصاح السنوي | `generateAnnualDisclosurePDF` | `useReportsExport.handleExportDisclosure` |
| الحسابات الختامية (التقرير السنوي) | `generateAnnualReportPDF` | `useReportsExport.handleExportPDF` |
| توزيع الحصص | `generateDistributionsPDF` | `useReportsExport.handleExportDistribution` |

## آلية التحقق من صحة المستند

بدلاً من mocking كامل لـ jsPDF، نعمل:

1. **استخدام jsPDF + jspdf-autotable الحقيقيين** (لا `vi.mock('jspdf')`).
2. **Mock محدود فقط لـ `loadArabicFont`** → يُرجع `false` فيستخدم الخط الافتراضي (يتفادى جلب ملفات `.ttf` من الشبكة في jsdom).
3. **Mock لـ `finalizePdf`** بحيث يلتقط الكائن `doc` ويستخرج `doc.output('arraybuffer')` بدلاً من حفظه إلى الملف، ثم يُرجعه للاختبار.
4. **Mock صامت لـ `sonner` toast و `logger`** (موجود مسبقاً كنمط).

لكل سيناريو نتحقق من:

- **توقيع PDF**: أول 4 بايتات = `%PDF` (سحري قياسي).
- **حجم معقول**: `byteLength > 1000` لاستبعاد ملف فارغ.
- **عدد صفحات ≥ 1**: عبر `doc.getNumberOfPages()`.
- **اسم الملف المتوقّع** يحوي تسمية السنة المالية (مثلاً `annual-disclosure-2024-2025.pdf`).
- **استدعاء `finalizePdf` مرة واحدة بالضبط**.

## بنية الاختبار (تفاصيل تقنية)

- إعداد بيانات `ReportsExportInput` ثابتة في `beforeAll` (سنة `2024-2025`، إيرادات/مصروفات/مستفيدان).
- لكل اختبار: استدعاء الـ handler من `useReportsExport({...})` مباشرة (الـ hook بلا React state — مجرد دالة تُرجع handlers، تعمل خارج render).
- التقاط الـ `doc` عبر `vi.mock('@/utils/pdf/core/core', async (importOriginal) => ({ ...await importOriginal(), finalizePdf: vi.fn((doc, _f, name) => { capturedDoc = doc; capturedName = name; }), loadArabicFont: vi.fn().mockResolvedValue(false) }))`.
- التحويل: `const bytes = new Uint8Array(capturedDoc.output('arraybuffer'))` ثم `expect(String.fromCharCode(...bytes.slice(0,4))).toBe('%PDF')`.

## ملاحظات

- لا تغييرات على كود الإنتاج — فقط ملف اختبار واحد جديد.
- الاختبارات الحالية للـ unit-mocks تبقى كما هي (تغطي تفاصيل النص والجداول).
- متوقع زمن التشغيل: ~2-4 ثوان (jsPDF داخل jsdom).
- في حال فشل تحميل `jspdf-autotable` في jsdom، يُضاف polyfill بسيط لـ `Canvas` (موجود مسبقاً في `src/test/setup.ts`).
