

# خطة شاملة: إكمال ZATCA + إصلاح مشاكل التقرير الجنائي

## ملخص الحالة الحالية

بعد فحص الكود، هذا ما تم تنفيذه بالفعل وما لم يُنفّذ:

**تم تنفيذه:**
- ✅ DB Migration: أعمدة VAT + ZATCA على `invoices` و `payment_invoices` (بما فيها `file_path`)
- ✅ `PdfWaqfInfo` يحتوي `vatNumber` + `addHeader` يعرضه
- ✅ `generate-invoice-pdf` Edge Function: font caching + `upsert: false` + VAT fields في الـ interface
- ✅ `ZatcaSettingsTab` UI كامل
- ✅ Hooks محدثة (`useInvoices`, `usePaymentInvoices`)
- ✅ `generate_contract_invoices` RPC محدث بدعم VAT
- ✅ Triggers منع التعديل بعد ZATCA submission
- ✅ CR-3 (سياسة "Anyone can read settings" القديمة) **محذوفة بالفعل** في migration لاحقة

**لم يُنفّذ بعد:**
- ❌ `paymentInvoice.ts`: لا يزال يحفظ محلياً (`doc.save`) — لا يُرفع لـ Storage
- ❌ VAT شرطي في `paymentInvoice.ts` PDF
- ❌ QR Code TLV في الفواتير (لا Edge Function ولا client)
- ❌ Font caching في `core.ts` (client-side)
- ❌ `isValidLogoUrl` يرفض Supabase Storage URLs
- ❌ `.env` غير موجود في `.gitignore`
- ❌ `check_rate_limit` race condition
- ❌ VAT Switch في `ExpenseFormDialog` و `ContractFormDialog`
- ❌ VAT rows في Edge Function PDF

---

## خطة التنفيذ (مرتبة بالأولوية)

### المهمة 1: إصلاحات أمنية فورية

**`.gitignore`** — إضافة `.env` و `.env.*`:
```
.env
.env.*
!.env.example
```

**`check_rate_limit`** — Migration لإصلاح race condition:
```sql
-- عند CONFLICT: زيادة العداد بدلاً من إعادة التعيين
ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1, window_start = now();
```

### المهمة 2: إصلاح `isValidLogoUrl` في `core.ts`

تعديل الدالة لتقبل URLs من Supabase Storage:
```typescript
const isValidLogoUrl = (url: string): boolean => {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    // Allow same-origin + Supabase storage URLs
    if (parsed.origin === window.location.origin) return true;
    if (parsed.hostname.endsWith('.supabase.co')) return true;
    return false;
  } catch { return false; }
};
```

### المهمة 3: Font caching في `core.ts` (client-side)

إضافة module-level cache لتجنب إعادة تحميل الخطوط:
```typescript
let fontCache: { regular: string; bold: string } | null = null;

export const loadArabicFont = async (doc: jsPDF) => {
  if (!fontCache) {
    // fetch + convert to base64 مرة واحدة
    fontCache = { regular: regularBase64, bold: boldBase64 };
  }
  // استخدام fontCache مباشرة
};
```

### المهمة 4: تحديث `paymentInvoice.ts` — VAT شرطي + رفع لـ Storage

**التغييرات الأساسية:**

1. إضافة `vatRate` و `vatAmount` لـ `PaymentInvoicePdfData` interface
2. إضافة صفوف VAT شرطية في الجدول:
   - إذا `vatRate > 0`: عرض "المبلغ قبل الضريبة" + "VAT 15%" + "الإجمالي شاملاً الضريبة" + "فاتورة ضريبية مبسّطة"
   - إذا `vatRate === 0`: عرض "معفاة من ضريبة القيمة المضافة"
3. تغيير `doc.save()` → رفع لـ Storage + تحديث `payment_invoices.file_path`:
   - `doc.output('arraybuffer')` → upload to `invoices` bucket
   - تحديث record في DB بـ `file_path`
4. إرجاع `Blob` URL للعرض الفوري

### المهمة 5: إضافة QR Code TLV Base64

إنشاء دالة مساعدة `generateZatcaQrTLV` في ملف جديد `src/utils/zatcaQr.ts`:
- تُنشئ TLV encoding لـ 5 tags ZATCA
- تحوّل إلى Base64
- تولّد QR Code image (عبر مكتبة أو canvas API)

دمج QR في `paymentInvoice.ts`:
- إذا `vatRate > 0` والرقم الضريبي موجود → إضافة QR أسفل الجدول
- QR يحتوي: اسم المورد، الرقم الضريبي، التاريخ، الإجمالي، VAT

دمج QR في `generate-invoice-pdf` Edge Function:
- نفس المنطق لكن باستخدام Deno APIs

### المهمة 6: تحديث `generate-invoice-pdf` Edge Function — VAT rows في PDF

تعديل `generateInvoicePdf` لإضافة صفوف VAT شرطية:
- إذا `vat_rate > 0`: إضافة صفوف المبلغ الأساسي + VAT + الإجمالي
- إضافة الرقم الضريبي والعنوان في ترويسة PDF
- إضافة "فاتورة ضريبية مبسّطة" أو "معفاة"

### المهمة 7: VAT Switch في واجهات الإدخال

**`ExpenseFormDialog.tsx`**: إضافة Switch "خاضعة لـ VAT" يُحدد `vat_rate` (0 أو 15)
**`ContractFormDialog.tsx`**: إضافة خيار VAT على العقد

---

## ترتيب التنفيذ

```text
1. إصلاحات أمنية (.gitignore + rate_limit)
2. إصلاح isValidLogoUrl
3. Font caching (core.ts)
4. paymentInvoice.ts (VAT + Storage upload)
5. QR Code TLV (ملف مساعد + دمج)
6. Edge Function VAT rows
7. VAT Switch في واجهات الإدخال
```

## ملاحظة عن التقرير الجنائي

- **CR-3** ("Anyone can read settings" لا تزال موجودة): **خاطئ** — تم حذفها في migration `20260212074033`
- **CR-2** (verify_jwt = false): **بالتصميم** — التحقق يدوي داخل كل function عبر `getUser()`
- **H-6** (UNIQUE constraint): تم إصلاحه في migration `20260301124622` الذي أضاف `invoice_number` unique index
- **CR-1** (.gitignore بدون .env): **صحيح** — يجب الإصلاح
- **H-5** (isValidLogoUrl): **صحيح** — يجب الإصلاح
- **L-2** (rate_limit race condition): **صحيح** — يجب الإصلاح

