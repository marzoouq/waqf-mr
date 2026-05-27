# خطة التنفيذ — جلسة منفصلة لكل موجة

الموجات 2، 3، 5 منجزة. المتبقي 6 موجات، كل واحدة في **رسالة/جلسة مستقلة** مع اختبارات + linter + security scan بعد كل موجة، وتحديث `mem://index.md` عند الحاجة.

## ترتيب الجلسات

### الجلسة 1 — Wave 4: فصل Supabase عن Page Hooks
**الملفات:**
- `src/hooks/page/useEmailMonitorPage.ts` — نقل استدعاءات `supabase` إلى `src/hooks/data/email/useEmailMonitor.ts` (جديد)
- `src/hooks/page/usePropertiesForm.ts` — نقل RPC إلى `src/hooks/data/properties/usePropertiesFormData.ts` (جديد)

**القبول:** `rg "from ['\"]@/integrations/supabase/client" src/hooks/page/` يرجع 0.

---

### الجلسة 2 — Wave 6: تفكيك god-hook `useZatcaSettings.ts`
تقسيم إلى:
- `useZatcaCredentials.ts` (CSR/Certificate)
- `useZatcaProfile.ts` (بيانات المنشأة)
- `useZatcaCompliance.ts` (Onboard/Report/Renew)

**القبول:** كل ملف ≤ 200 سطر؛ الاختبارات الحالية تمر.

---

### الجلسة 3 — Wave 7: استبدال ألوان hardcoded بـ tokens ✅
- المسح: 4 hex فقط في `InvoicePreviewDialog.tsx` و `SignaturePad.tsx` — **كلها Canvas** (مسموحة).
- أُضيفت قاعدة ESLint `no-restricted-syntax` تمنع `Literal /^#[0-9a-fA-F]{3,8}$/` و `TemplateElement /#[0-9a-fA-F]{6}/` داخل `src/pages` و `src/components`، مع allowlist للملفّين Canvas.
- `bunx eslint src/components src/pages` → 0 انتهاك hex.
- `bunx vitest run` → 1809/1809 أخضر.

---

### الجلسة 4 — Wave 8: إصلاح اختبارات mock
- `useContracts.test.ts` وأخواتها: تحديث fixtures بعد إلزامية `fiscal_year_id`
- إضافة اختبارات للموجات 2/3/5

**القبول:** `bunx vitest run` أخضر بالكامل.

---

### الجلسة 5 — Wave 9: نقل النصوص العربية إلى constants
- إنشاء `src/constants/i18n/` لكل feature
- نقل النصوص من hooks إلى `messages.ar.ts`

**القبول:** `rg "[ا-ي]" src/hooks/data` يرجع 0 خارج تعليقات JSDoc.

---

### الجلسة 6 — Wave 10: ديون تقنية
- تفعيل ESLint cache في CI
- قاعدة `no-restricted-imports` لمنع supabase في `src/pages/`
- توثيق في `docs/ARCHITECTURE.md`

**القبول:** CI أسرع، lint gates فعّالة.

---

## ضمانات
- كل جلسة برسالة منفصلة، migrations في صيغة Lovable الموحّدة عند الحاجة
- بعد كل موجة: `bunx vitest run` + `supabase--linter` + `security--run_security_scan`
- تحديث `mem://index.md` بأي قاعدة جديدة
- لا قفز بين الموجات؛ كل موجة تكتمل قبل التالية

## خارج النطاق
- لا تغييرات على المصادقة أو `verify_jwt`
- لا تعديل الملفات المحمية (`client.ts`, `types.ts`, `config.toml`, `.env`)

**أبدأ بالجلسة 1 (Wave 4) عند الموافقة؟**
