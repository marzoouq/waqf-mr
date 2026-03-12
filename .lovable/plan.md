

# خطة اختبار توليد XML + توقيع فاتورة فعلية (End-to-End)

## الهدف
اختبار المسار الكامل: توليد XML → التحقق من البنية → محاكاة التوقيع الرقمي، للتأكد من عدم وجود أخطاء بعد إصلاحات الامتثال.

## النهج
بما أن الاختبار الفعلي عبر Edge Functions يتطلب شهادة ZATCA نشطة حقيقية (ليست placeholder) ومصادقة مستخدم أدمن، سنتبع نهجاً مزدوجاً:

### الجزء 1: اختبار وحدة محلي لمسار التوقيع (zatca-signer)
إنشاء ملف `supabase/functions/zatca-signer/index.test.ts` يتحقق من:

| # | السيناريو | التحقق |
|---|---|---|
| 1 | C14N يزيل XML declaration والتعليقات | المخرجات لا تحتوي `<?xml` أو `<!-- -->` |
| 2 | C14N يوسع self-closing tags | `<foo/>` → `<foo></foo>` |
| 3 | C14N يرتب السمات (xmlns أولاً) | ترتيب صحيح |
| 4 | sha256Base64 يُنتج hash صحيح | مقارنة مع قيمة معروفة |
| 5 | Invoice digest يستثني UBLExtensions + cac:Signature + QR | الهاش لا يتغير بتغيير هذه الكتل |
| 6 | buildXmlDsig يُنتج بنية صحيحة | وجود SignedInfo, SignatureValue, X509Certificate, xadesSignedProperties |
| 7 | QR TLV يحتوي Tags 1-5 الإلزامية | فك Base64 والتحقق من TLV |
| 8 | QR TLV يحتوي Tags 6-9 لفاتورة قياسية | التحقق من وجود tags إضافية |
| 9 | ICV injection يعمل بشكل صحيح | XML بعد الحقن يحتوي ICV الجديد |
| 10 | X509 parser يستخرج IssuerName و SerialNumber | اختبار مع شهادة حقيقية |

### الجزء 2: اختبار تكاملي عبر curl للـ Edge Functions
استدعاء `zatca-xml-generator` فعلياً عبر `supabase--curl_edge_functions` لفاتورة تجريبية (إذا وُجدت بيانات في قاعدة البيانات).

## التنفيذ
1. إنشاء `supabase/functions/zatca-signer/index.test.ts` — نسخ الدوال الأساسية محلياً (c14n, sha256Base64, buildXmlDsig, generateZatcaQrTLV, parseX509IssuerSerial, hexToBytes) + 10 اختبارات
2. تشغيل اختبارات `zatca-xml-generator` و `zatca-signer` معاً عبر `supabase--test_edge_functions`

## التغييرات
- **ملف جديد**: `supabase/functions/zatca-signer/index.test.ts` (10 اختبارات)
- **لا تغييرات** على الكود الإنتاجي

