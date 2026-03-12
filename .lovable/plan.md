

# تعديل ZATCA XML ليعكس طبيعة التأجير (وليس الشراء)

## المشكلة
الكود يستخدم `unitCode="PCE"` (قطعة — للسلع والمنتجات) في عنصر `InvoicedQuantity`، وهذا غير مناسب لتطبيق إيجار عقاري. حسب مواصفات ZATCA و UN/ECE Rec 20، الرمز الصحيح للخدمات الإيجارية هو `"MON"` (شهر) أو `"DAY"` (يوم).

## التغيير المطلوب

### الملف: `supabase/functions/zatca-xml-generator/index.ts`

**تغيير واحد فقط** — سطر 242:

```xml
<!-- قبل: -->
<cbc:InvoicedQuantity unitCode="PCE">1.000000</cbc:InvoicedQuantity>

<!-- بعد: -->
<cbc:InvoicedQuantity unitCode="MON">1.000000</cbc:InvoicedQuantity>
```

`MON` = شهر (UN/ECE Rec 20) — مناسب لفواتير الإيجار الشهرية/الدورية.

باقي الكود سليم ومتوافق مع طبيعة التأجير:
- اسم البند الافتراضي: `"إيجار عقاري"` ✅
- أنواع الفواتير: `rent`, `utilities`, `maintenance` ✅
- لا يوجد أي إشارة لـ "شراء" أو "purchase" في الكود ✅

