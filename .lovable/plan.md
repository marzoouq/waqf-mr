

## تحسين التنظيم الداخلي لملف `zatca-api/index.ts`

### الوضع الحالي
الملف 1143 سطر، الدوال المساعدة مبعثرة بدون تصنيف واضح. الترتيب الحالي:
- imports → ثوابت → `resolveZatcaUrl` → `logZatcaOperation` → `parseCertExpiry` → 12 دالة ASN.1 → `buildCsrExtensions` → `buildDistinguishedName` → `buildEcSpki` → `sha256Async` → `_hexToBytes` → `_derToPem` → ثوابت headers → المعالج الرئيسي

### التغييرات المطلوبة
إعادة ترتيب الملف بأقسام واضحة مع تعليقات فاصلة بارزة، **بدون تغيير أي منطق**:

```text
┌─────────────────────────────────────────────┐
│ 1. Imports & Constants                      │
│    (imports, URLs, env vars, common headers)│
├─────────────────────────────────────────────┤
│ 2. ASN.1 Encoding Utilities                 │
│    (asn1Length, asn1Wrap, asn1Sequence,      │
│     asn1Set, asn1Integer, asn1Oid,          │
│     asn1Utf8String, asn1PrintableString,    │
│     asn1BitString, asn1Context,             │
│     asn1OctetString, asn1Ia5String)         │
├─────────────────────────────────────────────┤
│ 3. CSR & Crypto Helpers                     │
│    (buildCsrExtensions, buildDN,            │
│     buildEcSpki, sha256Async,               │
│     _hexToBytes, _derToPem)                 │
├─────────────────────────────────────────────┤
│ 4. Certificate Helpers                      │
│    (parseCertExpiry)                         │
├─────────────────────────────────────────────┤
│ 5. ZATCA API Helpers                        │
│    (resolveZatcaUrl, logZatcaOperation)      │
├─────────────────────────────────────────────┤
│ 6. Main Handler                             │
│    ├── Auth & Rate Limiting                 │
│    ├── Action: test-connection              │
│    ├── Action: onboard                      │
│    ├── Action: compliance-check             │
│    ├── Action: production                   │
│    ├── Action: renew                        │
│    ├── Action: compliance-buyer/seller-qr   │
│    ├── Action: report / clearance           │
│    └── Invalid action fallback              │
└─────────────────────────────────────────────┘
```

### التفاصيل
- إضافة تعليقات فاصلة بارزة بين كل قسم: `// ═══════════════════════════════════════`
- نقل `ZATCA_COMMON_HEADERS` إلى قسم الثوابت في الأعلى (بجوار `ZATCA_URLS`)
- تجميع دوال ASN.1 الـ 12 معًا في قسم واحد
- نقل `parseCertExpiry` بعد دوال CSR/Crypto (منطقياً أقرب للشهادات)
- نقل `resolveZatcaUrl` و`logZatcaOperation` مباشرة قبل المعالج الرئيسي
- إضافة تعليق موجز لكل قسم action داخل المعالج
- **لا تغيير في المنطق أو السلوك — إعادة ترتيب وتعليقات فقط**

### الملف المُعدّل
ملف واحد: `supabase/functions/zatca-api/index.ts` — نفس المحتوى، ترتيب أفضل.

