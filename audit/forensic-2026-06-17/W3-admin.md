# W3 — Admin Dashboard (الفحص الجنائي الثاني — 2026-06-17)

30 finding. الأبرز:

**🔴 High (4):**
- `CollectionReport.tsx:17-18` — page-layer hooks في component
- `useAnnualReportExport.ts:46-48` — toast داخل hook (مخالف NoToastInDataHooks)
- 3 صفحات بلا loading/error: `AuditReportFinalPage`, `CleanupReportPage`, `HistoricalComparisonPage`

**🟡 Med (16):** مكونات >180 سطر (3)، Hex colors في SignaturePad/InvoicePreviewDialog، voucher RPCs بحاجة فحص دور server-side، Page Hook violations ثانوية، loading/error states ناقصة (4)

**🟢 Low (10):** `bg-white` بدل tokens، dynamic import غير ضروري، تسميات

**✅ نظيف:** لا `supabase.from()` في UI، لا قراءة `contracts` خام، لا duplicate handlers
