

# اختبار توليد ZATCA XML — خطة التنفيذ

بعد مراجعة الكود الحالي في `zatca-xml-generator/index.ts`، سأنشئ ملف اختبار شامل يتحقق من 8 سيناريوهات.

## ملف الاختبار: `supabase/functions/zatca-xml-generator/index.test.ts`

نسخ دوال `buildUBL` والمساعدات محلياً (لأنها غير مُصدّرة) ثم تشغيل الاختبارات التالية:

| # | السيناريو | التحقق |
|---|---|---|
| 1 | فاتورة قياسية إيجار 15% | `unitCode="MON"` ✓، لا `PCE` ✓، لا `BillingReference` ✓، لا `TaxExemption` ✓، عنوان مشتري كامل ✓، ترتيب TaxTotal صحيح ✓ |
| 2 | إشعار دائن (381) | `BillingReference` مع رقم الفاتورة الأصلية ✓ |
| 3 | إشعار مدين (383) | `BillingReference` ✓، `InvoiceTypeCode=383` ✓ |
| 4 | فاتورة معفاة (E) | `VATEX-SA-29-7` + سبب الإعفاء ✓ |
| 5 | فاتورة نسبة صفرية (Z) | `VATEX-SA-32` ✓ |
| 6 | فاتورة مبسطة | `name="0200000"` ✓، لا `LatestDeliveryDate` ✓، لا تفاصيل مشتري ✓ |
| 7 | عنصر Note | `languageID="ar"` + نص الملاحظة ✓ |
| 8 | عدم وجود PCE | فحص كل أنواع الفواتير — لا `PCE` في أي نوع ✓ |

## التنفيذ

إنشاء ملف اختبار واحد فقط: `supabase/functions/zatca-xml-generator/index.test.ts` يحتوي على نسخة محلية من `buildUBL` + 8 اختبارات Deno. ثم تشغيله عبر أداة اختبار Edge Functions.

