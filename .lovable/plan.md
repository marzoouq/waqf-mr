

# خطة تنفيذ التوصيات الأربع

## تقييم مُحدَّث بعد الفحص

| التوصية | الحجم الفعلي | ملاحظة |
|---------|-------------|--------|
| ١. postcss.config.js | سطر واحد | المشروع على Tailwind v4 فعلياً — المشكلة فقط خيار `config:` الزائد |
| ٣. مركزة الأدوار | 3 ملفات | `App.tsx` + `adminRoutes.tsx` (يحتوي `ADMIN_ACC` محلياً) |
| ٤. تقسيم useInvoices.ts | **غير مطلوب** | الملف 173 سطر فقط ومنظم جيداً — أقل بكثير من حد 250 سطر |
| ٥. إعادة تنظيم pdf/ | ~25 ملف + 15 test | أكبر تغيير — نقل ملفات وتحديث imports |

---

## التغييرات المقترحة

### 1. إصلاح `postcss.config.js` (تغيير بسيط)

إزالة خيار `config:` غير المدعوم في Tailwind v4. المشروع يعمل بالفعل على v4 (`^4.2.2`) مع صيغة v4 في `index.css` (`@import "tailwindcss"`, `@theme`, `@plugin`).

```js
// قبل
'@tailwindcss/postcss': { config: './tailwind.config.js' }
// بعد
'@tailwindcss/postcss': {}
```

> **ملاحظة**: الذاكرة المحفوظة تشير لتثبيت v3، لكن المشروع انتقل فعلياً لـ v4 بنجاح. سنحدّث الذاكرة.

### 2. مركزة ثوابت الأدوار

إنشاء `src/constants/roles.ts`:
```typescript
export const ADMIN_ROLES = ['admin', 'accountant'] as const;
export const ADMIN_ONLY = ['admin'] as const;
```

تحديث `App.tsx` و `adminRoutes.tsx` للاستيراد من الملف الجديد بدلاً من التكرار.

### 3. تقسيم useInvoices.ts — **إلغاء**

بعد الفحص تبيّن أن الملف **173 سطر فقط** ومنظم بالفعل:
- الأنواع والثوابت (سطر 18–55)
- Factory CRUD (سطر 61–73)
- استعلام بسنة مالية (سطر 75–94)
- حذف مع تنظيف Storage (سطر 100–124)
- توليد PDF (سطر 137–173)

لا حاجة لتقسيمه — هو أقل من نصف الحد المسموح (250 سطر).

### 4. إعادة تنظيم `src/utils/pdf/` إلى مجلدات فرعية

الهيكل المقترح:

```text
src/utils/pdf/
├── index.ts              (barrel — يبقى كما هو مع تحديث المسارات)
├── core/                 (البنية التحتية)
│   ├── core.ts
│   ├── pdfFonts.ts
│   ├── pdfLayout.ts
│   ├── pdfHelpers.ts
│   └── arabicReshaper.ts
├── reports/              (التقارير)
│   ├── reports.ts
│   ├── annualReport.ts
│   ├── comparison.ts
│   ├── forensicAudit.ts
│   └── comprehensiveBeneficiary.ts
├── invoices/             (الفواتير)
│   ├── invoice.ts
│   ├── invoices.ts
│   ├── paymentInvoice.ts
│   ├── paymentInvoiceClassic.ts
│   ├── paymentInvoiceCompact.ts
│   ├── paymentInvoiceProfessional.ts
│   └── paymentInvoiceShared.ts
├── entities/             (الكيانات)
│   ├── entities.ts
│   ├── accounts.ts
│   ├── expenses.ts
│   ├── beneficiary.ts
│   ├── bylaws.ts
│   └── auditLog.ts
├── shared/               (يبقى كما هو)
│   ├── computations.ts
│   ├── helpers.ts
│   ├── qrCode.ts
│   ├── renderers.ts
│   └── types.ts
└── __tests__/            (جميع ملفات الاختبار)
    └── *.test.ts
```

**الملفات المتأثرة:**
- نقل ~20 ملف TS إلى مجلدات فرعية
- نقل ~15 ملف test إلى `__tests__/`
- تحديث imports الداخلية (كل ملف يستورد من `./core` → `../core/core`)
- تحديث `index.ts` للمسارات الجديدة
- تحديث 3 ملفات خارجية تستورد مباشرة من مسارات PDF:
  - `PaymentInvoiceToolbar.tsx` (`@/utils/pdf/core`)
  - `useAnnualReportPage.ts` (`@/utils/pdf/annualReport`)
  - `AnnualReportViewPage.tsx` (`@/utils/pdf/annualReport`)

---

## الملفات المتأثرة — ملخص

| العملية | العدد |
|---------|-------|
| إنشاء | `src/constants/roles.ts` + 4 مجلدات فرعية |
| نقل | ~35 ملف (20 TS + 15 test) |
| تعديل imports داخلية | ~12 ملف PDF |
| تعديل imports خارجية | 3 ملفات |
| تعديل | `postcss.config.js`, `App.tsx`, `adminRoutes.tsx` |

