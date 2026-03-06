

# خطة: واجهة إدارة ZATCA + Edge Functions + إصلاحات حرجة

## التحقق من التقرير

| البند | النتيجة |
|-------|---------|
| Edge Function missing `}` | **صحيح** — سطر 475 `return` ثم مباشرة `Deno.serve` بدون إغلاق `generateInvoicePdf` |
| `accountant` مفقود من enum | **خاطئ** — تمت إضافته في migration `20260223005810` |
| `.env` في `.gitignore` | ملف `.env` يُدار تلقائياً في Lovable — لا حاجة لتعديل `.gitignore` |
| `upsert` fallback لا يُحدّث `file_path` | **صحيح** — عند فشل الرفع الأول ونجاح الثاني، يُحدّث `timestampPath` لكن لا يتحقق من نجاحه |

## المهام المطلوبة

### 1. إصلاح حرج: إضافة `}` لإغلاق `generateInvoicePdf` (سطر 475-477)

إضافة `}` بعد `return await pdfDoc.save();` وقبل تعليق HTTP Handler.

### 2. إصلاح `upsert` fallback في `paymentInvoice.ts`

تحقق من نجاح الرفع الثاني قبل تحديث `file_path`:
```typescript
const { error: retryError } = await supabase.storage...
if (!retryError) {
  await supabase.from('payment_invoices').update({ file_path: timestampPath })...
}
```

### 3. إنشاء صفحة إدارة ZATCA

ملف جديد: `src/pages/dashboard/ZatcaManagementPage.tsx`

**4 أقسام:**
- **بطاقات ملخص**: عدد الفواتير (مُرسلة / معلقة / مرفوضة) + حالة الشهادة
- **تبويب الشهادات**: عرض `zatca_certificates` + زر إنشاء CSR (يستدعي `zatca-api`)
- **تبويب الفواتير**: جدول `invoices` + `payment_invoices` مع فلتر `zatca_status` + أزرار إرسال
- **تبويب سلسلة التوقيع**: عرض `invoice_chain` (ICV, hash, timestamp)

### 4. ربط الصفحة بالتطبيق

- `App.tsx`: إضافة route `/dashboard/zatca` (admin only)
- `DashboardLayout.tsx`: إضافة رابط في القائمة الجانبية

### 5. إنشاء Edge Functions (3 وظائف)

**`zatca-xml-generator/index.ts`**:
- يقبل `invoice_id` + `table` (invoices/payment_invoices)
- يقرأ بيانات الفاتورة + إعدادات ZATCA
- يُنشئ UBL 2.1 XML مبسّط
- يحفظ في `zatca_xml` column
- يتحقق من JWT + دور admin

**`zatca-signer/index.ts`**:
- يقبل `invoice_id` + XML
- يحسب SHA-256 hash
- يحفظ في `invoice_chain` (ICV, hash, previous_hash)
- يُحدّث `invoice_hash` + `icv` في الفاتورة

**`zatca-api/index.ts`**:
- يقبل `action`: `onboard` | `report` | `clearance`
- `onboard`: إرسال CSR → حفظ CSID في `zatca_certificates`
- `report`/`clearance`: إرسال فاتورة → تحديث `zatca_status`
- يتطلب secrets: `ZATCA_API_URL`

### 6. تحديث `config.toml`

إضافة 3 وظائف جديدة مع `verify_jwt = false`.

### 7. طلب Secrets

سنطلب من المستخدم إدخال `ZATCA_API_URL` عبر أداة `add_secret`. المفتاح الخاص ZATCA و OTP سيُخزّنان كذلك عند جاهزية المستخدم للربط الفعلي مع هيئة الزكاة.

## ترتيب التنفيذ

```text
1. إصلاح Edge Function (إغلاق })
2. إصلاح paymentInvoice.ts fallback
3. إنشاء ZatcaManagementPage + ربطها
4. إنشاء zatca-xml-generator
5. إنشاء zatca-signer
6. إنشاء zatca-api
7. تحديث config.toml
```

