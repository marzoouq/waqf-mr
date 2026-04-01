

# خطة تنفيذ الخطوات 1–3

## الخطوة 1: حذف الملف المكرر `useDashboardRealtime`

**المشكلة**: `src/hooks/ui/useDashboardRealtime.ts` هو مجرد re-export من `hooks/data/useDashboardRealtime`. لا يوجد استيراد مباشر منه سوى mock واحد في اختبار.

**التغييرات**:
1. حذف `src/hooks/ui/useDashboardRealtime.ts`
2. إزالة سطر التصدير من `src/hooks/ui/index.ts`
3. تحديث mock في `src/pages/beneficiary/WaqifDashboard.test.tsx` ليشير إلى `@/hooks/data/useDashboardRealtime`

---

## الخطوة 2: نقل اختبار `useAccountsPage` إلى مكانه الصحيح

**المشكلة**: `src/hooks/financial/useAccountsPage.test.ts` يختبر hook موجود في `src/hooks/page/useAccountsPage.ts` — ملف الاختبار في المجلد الخطأ.

**التغييرات**:
1. نقل `src/hooks/financial/useAccountsPage.test.ts` إلى `src/hooks/page/useAccountsPage.test.ts` (إنشاء في المكان الجديد وحذف القديم)
2. لا تغيير في المحتوى — الاستيرادات تستخدم مسارات `@/` فهي صالحة بالفعل

---

## الخطوة 3: تقسيم `renderers.ts` (305 أسطر) إلى وحدات أصغر

**المشكلة**: ملف واحد يحتوي 7 دوال رسم مختلفة. نقسمه إلى 4 ملفات متخصصة.

**الملفات الجديدة في `src/utils/pdf/shared/`**:

| الملف | المحتوى |
|-------|---------|
| `renderers/sellerBuyer.ts` | `renderSellerInfo` + `renderBuyerInfo` |
| `renderers/invoiceMeta.ts` | `renderInvoiceMeta` |
| `renderers/tables.ts` | `renderLineItemsTable` + `renderAllowanceChargeTable` |
| `renderers/summary.ts` | `renderVatSummary` + `renderBankDetails` |

**تحديث الملفات القائمة**:
- `src/utils/pdf/shared/renderers.ts` — يصبح barrel file يعيد تصدير كل شيء من المجلد الفرعي (لا يكسر أي استيراد قائم)
- `src/utils/pdf/paymentInvoiceShared.ts` — لا تغيير (يستورد من `./shared/renderers` الذي لا يزال يصدّر كل شيء)

---

## الملفات المتأثرة (ملخص)
- **حذف**: `src/hooks/ui/useDashboardRealtime.ts`، `src/hooks/financial/useAccountsPage.test.ts`
- **تعديل**: `src/hooks/ui/index.ts`، `src/pages/beneficiary/WaqifDashboard.test.tsx`، `src/utils/pdf/shared/renderers.ts`
- **إنشاء**: `src/hooks/page/useAccountsPage.test.ts`، 4 ملفات في `src/utils/pdf/shared/renderers/`

