

## الفحص الجنائي — الجولة 13 (الفواتير وأنظمة PDF: 18 بنداً)

### التحقق بند بند مقابل الكود الفعلي

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **CRIT-01** | المعاينة ≠ PDF المُصدَّر | **✅ مؤكد** — 3 أنظمة مختلفة فعلاً. لكن هذا **بالتصميم**: المعاينة HTML تفاعلية، Edge Function للتخزين والأرشفة، jsPDF للتحميل المباشر. التوحيد الكامل = مشروع كبير (DEFER). **لكن** يجب إصلاح التناقضات الجزئية | جزئياً |
| **CRIT-02** | Edge Function لا تحتوي QR | **❌ مدحوض تماماً** — السطور 454-502 تحتوي على نظام QR كامل: استخراج TLV من zatca_xml أولاً (سطر 462-468)، fallback لـ generateZatcaQrTLV (سطر 472-480)، ثم `QRCode.toDataURL` (سطر 483) → `pdfDoc.embedPng` (سطر 492) → `page.drawImage` (سطر 497). **QR موجود ويعمل** | لا |
| **CRIT-03** | أسماء القوالب غير متسقة | **✅ مؤكد جزئياً** — InvoicePreviewDialog يُرسل `'professional'/'simplified'` → InvoicesPage يُمررها لـ Edge Function عبر `body.template`. Edge Function **لا تستخدم** هذا الحقل (لا switch عليه) → تتجاهله. **لكن**: Edge Function لها قالب واحد ثابت وهذا مقبول لأنها للتخزين/الأرشفة. paymentInvoice.ts يستخدم أسماء مختلفة (`classic/tax_professional/compact`) لأنها نظام منفصل | **نعم** — ربط template في PaymentInvoicesTab |
| **CRIT-04** | PaymentInvoicesTab لا يمرر template | **✅ مؤكد** — سطر 334: `onDownloadPdf={() => {...}}` بدون parameter template. يستدعي `handleDownloadPdf(origInv)` → يستخدم `invoiceTemplate` من state (سطر 228) | **نعم** |
| **CRIT-05** | Edge Function تستخدم `en-US` locale | **✅ مؤكد** — سطور 406-410: `toLocaleString("en-US", ...)`. المعاينة تستخدم `ar-SA`. **لكن**: Edge Function تُولّد PDF للتخزين/الأرشفة — الأرقام الغربية مقبولة في PDF رسمي عربي (ZATCA تقبل كليهما). ومع ذلك التوحيد أفضل | **نعم** |
| **CRIT-06** | WaqfSettings محدودة في Edge Function | **✅ مؤكد** — لا logo, لا IBAN, لا address في `fetchWaqfSettings`. Edge Function PDF لا يحتوي شعار أو بيانات بنكية | **نعم** |
| **CRIT-07** | `toLocaleString()` بلا locale + نسب ثابتة في reports.ts | **✅ مؤكد** — سطر 48: `.toLocaleString()` بلا locale. سطر 54: `(10%)` و`(5%)` مرمّزة ثابتاً | **نعم** |
| **CRIT-08** | `toFixed(6)` في disclosure PDF | **🟡 مقبول** — 6 أرقام عشرية للإفصاح القانوني يُظهر الدقة الكاملة. الحد عند 2 يفقد دقة النسب مثل 33.333333%. هذا **مقصود** للوثائق القانونية | لا |
| **CRIT-09** | `window.print()` يطبع الصفحة كاملة | **❌ مدحوض** — `index.css` سطور 380-448 تحتوي نظام `@media print` شامل: يخفي sidebar, nav, fixed elements. `[role="dialog"]` يُحوّل لـ `position: static` مع `max-width: 100%`. `[data-radix-dialog-overlay]` يُخفى. **الطباعة تعمل بشكل صحيح** — الـ Dialog يُعرض وحده | لا |
| **CRIT-10** | تسريب ذاكرة Object URL | **❌ مدحوض جزئياً** — PaymentInvoicesTab سطر 241: `URL.revokeObjectURL(blobUrl)` ✅. InvoicesPage يستخدم Edge Function (لا blob URLs) → لا تسريب. paymentInvoice.ts سطر 900 يُعيد blob URL → المستدعي في PaymentInvoicesTab يُحرره ✅ | لا |
| **HIGH-11** | buildPreviewData لا يتضمن lineItems | **🟡 مقبول بالتصميم** — جدول `invoices` يُخزّن `amount` الإجمالي. `invoice_items` جدول منفصل. بناء المعاينة من الجدول الرئيسي = بند واحد. **لكن**: يمكن تحسينه لاحقاً بجلب `invoice_items` | لا (DEFER-39) |
| **HIGH-12** | TemplateSelector يبدأ بـ professional دائماً | **✅ مؤكد** — سطر 23: `useState('professional')`. يجب أن يبدأ بنوع الفاتورة | **نعم** |
| **HIGH-13** | ترويسة مضاعفة على الصفحة الأولى | **❌ مدحوض** — `addHeaderToAllPages` تستدعي `addHeader` التي **لا تُرسم مباشرة** — تُعيد فقط `startY`. الترويسة الفعلية (النص والخطوط) تُرسم **مرة واحدة** في بداية كل PDF generator. `addHeaderToAllPages` في reports.ts **تُضيف** الترويسة للصفحات 2+ التي أنشأها autoTable تلقائياً | لا |
| **HIGH-14** | getLastAutoTableY مع fallback | **🟡 مقبول** — `lastAutoTable.finalY` يُعيد الموضع الصحيح بغض النظر عن عدد الصفحات. jsPDF يحافظ على سياق الصفحة الأخيرة | لا |
| **MED-15** | compact بدون footer | **🟡 بالتصميم** — القالب المختصر مصمم كإيصال بسيط بدون إطار أو تذييل رسمي | لا |
| **MED-16** | iframe يعرض blob URL | **✅ مقبول** — blob URLs مؤقتة وآمنة | لا |
| **MED-17** | Edge Function تفترض invoice_type | **🟡 مقبول** — عند `payment_invoices`: `invoice_type` = undefined → `TYPE_AR[undefined]` = undefined → fallback يعرض `invoice.invoice_type` كنص خام. لا crash، مجرد عرض "undefined" في الحقل | **نعم** (بسيط) |
| **MED-18** | docs/API.md خاطئ | **✅ مؤكد** لكن إصلاح التوثيق ليس أولوية فورية | لا (DEFER-40) |

---

### الإصلاحات المطلوبة — 7 تغييرات في 4 ملفات

#### 1. `src/components/invoices/InvoicePreviewDialog.tsx`
**HIGH-12**: ربط القالب الافتراضي بنوع الفاتورة:
```tsx
const [template, setTemplate] = useState<'professional' | 'simplified'>(
  invoice?.type === 'standard' ? 'professional' : 'simplified'
);
```
يحتاج `useEffect` لتحديث القيمة عند تغير `invoice`.

#### 2. `src/components/contracts/PaymentInvoicesTab.tsx`
**CRIT-04**: تمرير template المختار من المعاينة إلى `handleDownloadPdf`:
```tsx
onDownloadPdf={(template) => {
  const origInv = invoices?.find(...);
  if (origInv) handleDownloadPdf(origInv, template === 'professional' ? 'tax_professional' : 'compact');
}}
```
هذا يتطلب تعديل `handleDownloadPdf` ليقبل template parameter اختياري.

#### 3. `supabase/functions/generate-invoice-pdf/index.ts`
**CRIT-05**: تغيير `"en-US"` إلى `"ar-SA"` في سطور 406-410
**CRIT-06**: توسيع `fetchWaqfSettings` لجلب `waqf_logo_url`, `waqf_bank_iban`, `waqf_bank_name`, `business_address_*`، وإضافة الشعار وبيانات IBAN في PDF
**MED-17**: إضافة fallback لـ `invoice_type` عند payment_invoices:
```typescript
const typeLabel = TYPE_AR[invoice.invoice_type] || (tableName === 'payment_invoices' ? 'إيجار' : invoice.invoice_type || '—');
```

#### 4. `src/utils/pdf/reports.ts`
**CRIT-07**: 
- سطر 48-56: إضافة `'ar-SA'` لكل `toLocaleString()`
- سطر 54-55: استبدال `(10%)` و`(5%)` بالنسب الفعلية من `data`:
```typescript
reshapeRow([`حصة الناظر (${data.adminPct ?? 10}%)`, data.adminShare.toLocaleString('ar-SA')]),
reshapeRow([`حصة الواقف (${data.waqifPct ?? 5}%)`, data.waqifShare.toLocaleString('ar-SA')]),
```
هذا يتطلب التحقق من أن `data` يحتوي على `adminPct` و`waqifPct`. إذا لم يكونا موجودين سيبقى الافتراضي.

---

### بنود مدحوضة بارزة

| # | الادعاء | الحقيقة |
|---|---------|---------|
| **CRIT-02** | QR مفقود في Edge Function | **QR موجود ويعمل** — سطور 454-502: استخراج من XML أو توليد TLV + رسم QR image |
| **CRIT-09** | `window.print()` يطبع كل الصفحة | **نظام print CSS شامل** في index.css: يخفي كل شيء عدا Dialog |
| **CRIT-10** | تسريب Object URL | **PaymentInvoicesTab يُحرر blob URL** في finally block |
| **HIGH-13** | ترويسة مضاعفة | **addHeaderToAllPages تُضيف للصفحات الجديدة فقط** |

---

### بنود مؤجلة

| # | الوصف | الأولوية |
|---|-------|---------|
| DEFER-39 | جلب invoice_items لمعاينة الفواتير متعددة البنود | متوسطة |
| DEFER-40 | تحديث docs/API.md | منخفضة |

---

### ملخص التأثير

- **4 ملفات** تُعدَّل (1 component + 1 tab + 1 edge function + 1 utils)
- من أصل 18 بنداً: **7 للإصلاح**, **2 مؤجلة**, **9 مدحوضة/مقبولة**
- أبرز المدحوضات: **CRIT-02** (QR موجود بالكامل), **CRIT-09** (print CSS يعمل), **CRIT-10** (لا تسريب ذاكرة)

