# lib/contracts

طبقة خدمات Stateful مرتبطة بالعقود — تتعامل مع جانب البيانات
(Supabase) و/أو الإشعارات والآثار الجانبية. **لا تضع هنا دوالاً صرفة
(pure functions)؛ مكانها `src/utils/contracts/`.**

## المحتويات

- **`invoiceSync.ts`** — مزامنة فواتير العقد بعد التعديل/التجديد:
  حذف الفواتير غير المدفوعة، إنشاء الفواتير الجديدة وفق محطات الدفع،
  وضمان عدم حذف الفواتير المدفوعة جزئياً
  (راجع `mem://business-logic/contracts/invoice-deletion-safety-guard`).

## قواعد الحدود (lib vs utils)

| المعيار | `lib/contracts/` | `utils/contracts/` |
|---|---|---|
| يستورد `supabase` client | ✅ نعم | ❌ ممنوع |
| يستدعي `uiNotify`/toast | ✅ مسموح | ❌ ممنوع |
| دوال صرفة (Pure) | ❌ | ✅ |
| يستورد من `@/types` فقط | — | ✅ مُلزم |

راجع `mem://technical/architecture/lib-vs-utils-boundary` للتفاصيل الكاملة.
