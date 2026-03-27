

# الجلسة السابعة — فحص وتحسين 4 ملفات رئيسية

## الملفات المفحوصة وحالتها

### 1. `zatca-xml-generator/index.ts` (548 سطر)
**الحالة**: يعمل بشكل سليم أمنياً (getUser + role check + rate limiting + UUID validation)

**تحسينات مقترحة:**
- **استخراج `buildUBL`** (~330 سطر) إلى ملف مشترك `_shared/zatca-xml-builder.ts` — الدالة ضخمة وقابلة لإعادة الاستخدام
- **استبدال `console.error`** بـ structured logging (سطر 545)
- **إضافة validation بـ Zod** لـ request body بدلاً من التحقق اليدوي (سطر 454-457)
- **إضافة `Content-Type` check**: التأكد أن الطلب `application/json`

### 2. `FiscalYearContext.tsx` (118 سطر)
**الحالة**: نظيف ومحكم — fallback آمن، localStorage مع UUID validation، دعم bfcache

**لا تحسينات جوهرية مطلوبة** — الملف بحجم مناسب ومنظم جيداً.

### 3. `AuthContext.tsx` (254 سطر)
**الحالة**: مستقر — race condition محلول، safety timeout، stale closure fix، HMR support

**تحسين بسيط واحد:**
- **تنظيف localStorage في signOut**: القائمة طويلة (10 عناصر) — يمكن استخراجها لثابت `CLEARABLE_STORAGE_KEYS`

### 4. `SystemDiagnosticsPage.tsx` (168 سطر)
**الحالة**: نظيف وقصير بما يكفي

**لا تحسينات مطلوبة** — الملف مقروء ومنظم.

---

## خطة التنفيذ

### المهمة 1: استخراج `buildUBL` من zatca-xml-generator
- إنشاء `supabase/functions/_shared/zatca-xml-builder.ts`
- نقل `buildUBL` + الدوال المساعدة (`getInvoiceTypeInfo`, `getVatCategoryCode`, `getTaxExemptionInfo`, `escapeXml`) + الأنواع (`LineItemInput`, `AllowanceChargeInput`)
- تحديث `zatca-xml-generator/index.ts` ليستورد من الملف المشترك
- **النتيجة**: `index.ts` ينخفض من ~548 إلى ~135 سطر

### المهمة 2: إضافة Zod validation + Content-Type check
- استبدال التحقق اليدوي من `invoice_id` و `table` بـ schema Zod
- إضافة فحص `Content-Type: application/json`
- استبدال `console.error` بهيكل خطأ منظم

### المهمة 3: استخراج مفاتيح localStorage من AuthContext
- إنشاء ثابت `CLEARABLE_STORAGE_KEYS` في ملف مشترك أو أعلى الملف
- تبسيط حلقة الحذف في `signOut`

---

## الأثر

| الملف | قبل | بعد |
|-------|------|------|
| `zatca-xml-generator/index.ts` | 548 سطر | ~135 سطر |
| `_shared/zatca-xml-builder.ts` | — | ~420 سطر (جديد) |
| `AuthContext.tsx` | 254 سطر | ~245 سطر |
| `FiscalYearContext.tsx` | بدون تغيير | — |
| `SystemDiagnosticsPage.tsx` | بدون تغيير | — |

