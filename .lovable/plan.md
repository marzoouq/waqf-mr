

# إضافة 3 اختبارات وحدة جديدة لـ buildUBL

## الاختبارات المطلوبة

### Test 9: فحص سمات schemeID
يتحقق من وجود جميع سمات `schemeID` المطلوبة في العناصر الصحيحة:
- `schemeID="CRN"` في PartyIdentification للبائع
- `schemeID="TIN"` في CompanyID
- `schemeID="UN/ECE 5305"` + `schemeAgencyID="6"` في كل TaxCategory ID (AllowanceCharge + TaxSubtotal + ClassifiedTaxCategory)
- `schemeID="UN/ECE 5153"` + `schemeAgencyID="6"` في كل TaxScheme ID
- `schemeID="NAT"` في PartyIdentification للمشتري (قياسية فقط)

### Test 10: فحص AllowanceCharge و LegalMonetaryTotal
يتحقق من اكتمال البنية الإلزامية:
- `ChargeIndicator=false`
- `AllowanceChargeReason=discount`
- `Amount currencyID="SAR"` بقيمة `0.00`
- `AllowanceTotalAmount` و `PrepaidAmount` موجودتان في LegalMonetaryTotal (حتى لو = 0)
- جميع عناصر LegalMonetaryTotal: `LineExtensionAmount`, `TaxExclusiveAmount`, `TaxInclusiveAmount`, `PayableAmount`

### Test 11: فحص تنسيق Percent
يتحقق من أن قيم `<cbc:Percent>` دائماً بمنزلتين عشريتين:
- `15` → `15.00` (ليس `15` أو `15.0`)
- `0` → `0.00`
- `5` → `5.00`

## التغيير

ملف واحد: `supabase/functions/zatca-xml-generator/index.test.ts` — إلحاق 3 اختبارات جديدة في نهاية الملف (بعد Test 8).

