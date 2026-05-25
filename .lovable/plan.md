
# خطة إصلاح ضريبة العقود (VAT Exemption Sync)

تم التحقق: التحليل المُرسَل دقيق. الكود الحالي يقرأ `properties.vat_exempt` في `generate_contract_invoices`، لكن الفواتير القائمة لا تُحدَّث (`CONTINUE`)، وإنشاء الفاتورة اليدوية يفرض `vatRate: 15`. لا توجد سجلات متضررة حالياً في Test/Live، لكن الخلل المنطقي قائم وسيظهر فور تبديل `vat_exempt`.

النطاق: **مزامنة آمنة + منع تكرار المشكلة + توضيح العرض**. بدون لمس أي فاتورة دخلت ZATCA.

---

## 1) Migration — تحديث `generate_contract_invoices`

استبدال `CONTINUE` للفواتير القائمة بمنطق UPDATE مشروط:

- إذا الفاتورة `pending`/`overdue` **و** `paid_amount = 0/NULL` **و** `zatca_status = 'not_submitted'` **و** `icv IS NULL` **و** `invoice_hash IS NULL` **و** `zatca_xml IS NULL`:
  - تحديث `vat_rate`, `vat_amount`, `amount`, `due_date`, `fiscal_year_id`
- خلاف ذلك: `CONTINUE` (حماية ZATCA والمدفوعات).

## 2) RPC جديدة: `sync_property_contract_invoice_vat(p_property_id uuid)`

- صلاحية: `admin` + `accountant`.
- تستدعي `generate_contract_invoices` لكل عقد ساري على العقار (أو UPDATE مباشر بنفس شروط الحماية أعلاه).
- تُستدعى تلقائياً عند تحديث `properties.vat_exempt` عبر trigger `AFTER UPDATE OF vat_exempt`، أو من الواجهة بعد حفظ العقار.
- ترجع عدد الفواتير المحدّثة وعدد المتخطّاة (مدفوعة/ZATCA).

## 3) Migration — تصحيح بيانات لمرة واحدة (دفاعي)

`UPDATE payment_invoices SET vat_rate=0, vat_amount=0` فقط للفواتير التي تطابق شروط الحماية الكاملة (غير مدفوعة، غير مرسلة، لا hash/icv/xml) وعقارها معفى. لا نتوقع صفوفاً متأثرة حالياً، لكنها شبكة أمان.

## 4) Frontend — مسار الفاتورة اليدوية

ملف `src/hooks/page/admin/financial/useCreateInvoiceForm.ts`:
- حذف `vatRate: 15` الصلب.
- جلب `vat_exempt` ضمن join العقود (تعديل CONTRACT_SELECT_FIELDS أو select مخصص لهذه الشاشة).
- عند اختيار عقد: `vatRate = contract.property.vat_exempt ? 0 : Number(defaultVatRate ?? 15)`.
- البنود الافتراضية الجديدة ترث `vatRate` المحسوب من العقد المختار، وإلا `defaultVatRate`.

ملف `InvoiceItemsTable.tsx`:
- `allowances`/`charges` الجديدة ترث `vatRate` من العنصر الأول بدل `15` ثابت.

## 5) Frontend — عرض واضح للإعفاء

`PaymentInvoiceDesktopTable` و `PaymentInvoiceMobileCards`:
- عمود الضريبة: إذا `vat_rate === 0` يعرض شارة "غير خاضعة" بدل "0.00 ر.س".
- إذا `vat_amount > 0` يعرض `{المبلغ} ر.س ({vat_rate}%)`.

## 6) Hook حفظ العقار

`useCreateProperty`/`useUpdateProperty` (أو page hook المقابل):
- بعد نجاح UPDATE وتغيّر `vat_exempt`، استدعاء `sync_property_contract_invoice_vat` ثم Toast: "تم تحديث X فاتورة، تم تخطي Y فاتورة محمية".

## 7) ZATCA XML Fallback

`zatca-xml-builder.ts`: تغيير `?? 15` النهائي إلى `?? 0` مع `logger.warn` عند الوقوع في fallback (لا يجب الوصول إليه أصلاً لأن `vat_rate` محفوظ على الفاتورة).

## 8) اختبارات

- Vitest: `useCreateInvoiceForm` — اختيار عقد لعقار معفى ⇒ `vatRate=0`.
- Vitest: عرض الجدول — `vat_rate=0` ⇒ "غير خاضعة".
- (اختياري) snapshot SQL يدوي على Test بعد التطبيق.

---

## قيود إلزامية

- **عدم لمس** أي فاتورة `zatca_status != 'not_submitted'` أو لها `invoice_hash`/`icv`/`zatca_xml`.
- **عدم لمس** أي فاتورة `paid`/`partially_paid` أو `paid_amount > 0`.
- إقفال السنة المالية: لا تشغيل المزامنة على فواتير سنة مُقفلة (يحترمها فحص الحالة + `is_fiscal_year_accessible`).
- لا تعديل على `client.ts` / `types.ts` / `config.toml` / `.env`.

## ملفات متوقع تعديلها

```text
supabase/migrations/<new>.sql           ← #1 + #2 + #3
src/hooks/page/admin/financial/useCreateInvoiceForm.ts
src/hooks/data/contracts/* (CONTRACT_SELECT_FIELDS)
src/components/invoices/create-invoice/InvoiceItemsTable.tsx
src/components/contracts/PaymentInvoiceDesktopTable.tsx
src/components/contracts/PaymentInvoiceMobileCards.tsx
src/hooks/page/admin/useProperties* (استدعاء sync بعد update)
src/utils/zatca/zatca-xml-builder.ts
```

## ما خارج النطاق

- نقل `vat_exempt` إلى مستوى العقد (تغيير نموذج بيانات كبير) — يُترك كاقتراح مستقبلي.
- تصحيح فواتير ZATCA المُرسَلة (يتطلب قرار محاسبي + إصدار credit notes).
