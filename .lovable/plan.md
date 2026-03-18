

# نتيجة الفحص المنهجي — تقرير ZATCA

## تصحيح الادعاءات

| البند | الادعاء | الحقيقة بالكود |
|-------|---------|---------------|
| **ZATCA-CRIT-2** "لا Webhook" | ❌ **خطأ** | الكود **لا يحتاج webhook**. سطور 750-753: `zatca-api` يرسل الفاتورة ويستقبل الرد فوراً (synchronous) ويُحدّث `zatca_status` مباشرة (`cleared`/`reported`/`rejected`). ZATCA API هو REST عادي وليس async — لا يوجد callback لاحق |
| **ZATCA-CRIT-4** PDF/A-3 | 🟡 **صحيح جزئياً** | PDF/A-3 مع XML مدمج متطلب لـ B2B Standard فقط. معظم أوقاف العقارات تستخدم Simplified (B2C). هذا تحسين مستقبلي وليس blocker |
| **ZATCA-MED-3** activity_code في CSR | ❌ **خطأ** | سطر 146-151: `buildCsrExtensions` يحقن `deviceSerial` في SAN extension عبر OID `0.9.2342.19200300.100.1.1` وهو المطلوب |

## ما هو مؤكد فعلاً ويستحق الإصلاح

| # | المشكلة | الأولوية | التأكيد |
|---|---------|---------|---------|
| **Z2** | `invoice_chain.invoice_id` بدون FK | 🟠 عالية | ✅ مؤكد — الجدول بلا foreign key (لكن `source_table` يجعل FK مزدوج معقداً لأنه يشير لـ `invoices` أو `payment_invoices`) |
| **Z3** | `default_vat_rate` لا يُستخدم كـ fallback | 🟠 عالية | ✅ مؤكد — `fallbackVatRate = Number(inv.vat_rate ?? 0)` يسقط إلى 0 بدل سحب القيمة من `app_settings` |
| **Z4** | `PaymentMeans` ثابت كـ 10 | 🟡 متوسطة | ✅ مؤكد — سطر 125: `inv.payment_means_code || "10"` — لكن الحقل موجود ديناميكياً عبر `inv.payment_means_code`، المشكلة أن الجدول لا يحتوي هذا العمود |
| **Z5** | لا validation لـ VAT number قبل XML | 🟡 متوسطة | ✅ مؤكد — سطر 94: `vatNumber = settings.vat_registration_number || ""` بدون تحقق من الطول/الصيغة |
| **Z8** | C14N whitespace | 🟡 متوسطة | ✅ مؤكد — سطر 80: `>\s+<` → `>\n<` — لكن هذا يعمل مع Sandbox حالياً. إذا فشل مع Production سيظهر كخطأ توقيع |

## خطة التنفيذ — 3 إصلاحات حقيقية

### الإصلاح 1: `default_vat_rate` fallback في XML generator
**ملف:** `supabase/functions/zatca-xml-generator/index.ts`
- سطر 132: تغيير `fallbackVatRate` ليسحب من `settings.default_vat_rate` إذا كان `inv.vat_rate` فارغاً
- تأثير: يمنع توليد فواتير بضريبة 0% عن طريق الخطأ

### الإصلاح 2: VAT number validation قبل بناء XML
**ملف:** `supabase/functions/zatca-xml-generator/index.ts`
- إضافة تحقق: `vatNumber` يجب أن يكون 15 رقماً ويبدأ بـ `3` وينتهي بـ `3`
- إرجاع خطأ واضح بدل توليد XML خاطئ

### الإصلاح 3: FK constraint على `invoice_chain`
**نوع:** Migration
- بما أن `source_table` يحدد الجدول المرجعي (`invoices` أو `payment_invoices`)، لا يمكن استخدام FK عادي
- الحل: إضافة trigger يتحقق من وجود `invoice_id` في الجدول المناسب قبل INSERT

### ما لا يحتاج إصلاحاً الآن
- **Webhook**: غير مطلوب — ZATCA API synchronous والحالة تُحدَّث فوراً
- **PDF/A-3**: تحسين مستقبلي لـ B2B فقط
- **C14N**: يعمل مع Sandbox، يُراقب عند الانتقال لـ Production
- **PaymentMeans**: الحقل جاهز ديناميكياً في الكود، يحتاج فقط إضافة عمود في الجدول (تغيير مستقبلي)

## ملخص الملفات

| الملف | نوع التغيير |
|-------|------------|
| `supabase/functions/zatca-xml-generator/index.ts` | تعديل (fallback VAT + validation) |
| Migration: `invoice_chain` validation trigger | جديد |

**إجمالي:** 2 ملف + 1 migration

