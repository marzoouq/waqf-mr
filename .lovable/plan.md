

# فحص جنائي: تكامل ZATCA — الثغرات والإصلاحات المطلوبة

## نتائج الفحص

### 1. ثغرة حرجة: `ZATCA_API_URL` غير مُعيَّن كسر (Secret)
السر الوحيد المتوفر حالياً: `LOVABLE_API_KEY` و `PII_ENCRYPTION_KEY`. هذا يعني أن **كل** عمليات الربط الفعلي مع بوابة فاتورة (onboarding, compliance, reporting, clearance) ستفشل. الكود في `zatca-api/index.ts` سطر 6 يقرأ `ZATCA_API_URL` من البيئة ويعود بخطأ إذا كان فارغاً (سطر 249-251) — ما عدا الـ onboarding الذي يُنشئ شهادة placeholder تطويرية.

**الإصلاح**: إضافة `ZATCA_API_URL` كسر بيئي مع قيمة sandbox أو production.

### 2. مفقود: قسم "ربط API" واختبار الاتصال
الصورة المرجعية تظهر قسماً لربط API واختبار الاتصال. الحالي لا يحتوي على:
- حقل عرض/تحديد URL البوابة (sandbox vs production) — الاختيار موجود بصرياً لكن **لا يُؤثر فعلياً** على `ZATCA_API_URL`
- زر "اختبار الاتصال" للتحقق من إمكانية الوصول لبوابة فاتورة
- مؤشر حالة الاتصال (متصل/غير متصل)

### 3. مفقود: الربط بين اختيار المنصة و API URL
في `ZatcaSettingsTab.tsx` يمكن للمستخدم التبديل بين "فاتورة" و"محاكاة فاتورة" — لكن هذا الاختيار **لا يؤثر** على شيء. الـ `zatca-api` يقرأ `ZATCA_API_URL` من env فقط (سطر 6). يجب أن يقرأ من `app_settings.zatca_platform` ويحدد الـ URL تلقائياً:
- Production: `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`
- Sandbox: `https://gw-fatoora-sandbox.zatca.gov.sa/e-invoicing/simulation`

### 4. خلل: الـ clearance vs reporting لا يُحدد تلقائياً
في `ZatcaManagementPage.tsx` سطر 452، الإرسال دائماً `action: 'report'`. لكن حسب معايير ZATCA:
- الفاتورة **القياسية (standard)** تتطلب **clearance** (اعتماد فوري)
- الفاتورة **المبسطة (simplified)** تتطلب **reporting** (إبلاغ)

يجب تحديد الإجراء تلقائياً بناءً على `invoice_type`.

### 5. مفقود: عرض رسائل Compliance من ZATCA
في `zatca-api/index.ts` سطر 456-462، يُعيد `zatca_response` لكن الـ response لا يُفكك بشكل صحيح — `complianceResult.validationResults` و `complianceResult.warningMessages` قد لا تتطابق مع بنية ZATCA الفعلية. بنية ZATCA تُعيد:
```json
{
  "validationResults": {
    "infoMessages": [...],
    "warningMessages": [...],
    "errorMessages": [...],
    "status": "PASS|WARNING|ERROR"
  }
}
```
لكن الكود يعالجها كأنها في المستوى الأعلى (سطر 725-758 في ZatcaManagementPage).

---

## خطة الإصلاح

### المهمة 1: إضافة ZATCA_API_URL وربطه باختيار المنصة
- إضافة `ZATCA_API_URL` كسر بيئي (sandbox افتراضياً)
- تعديل `zatca-api/index.ts` ليقرأ `zatca_platform` من `app_settings` ويحدد URL تلقائياً بدلاً من الاعتماد على env فقط — fallback للـ env إذا وُجد

### المهمة 2: إضافة قسم "حالة الربط واختبار الاتصال" في ZatcaSettingsTab
- إضافة بطاقة جديدة تعرض:
  - URL البوابة الحالي (sandbox/production) محدد تلقائياً
  - زر "اختبار الاتصال" يستدعي `zatca-api` بـ `action: 'test-connection'`
  - مؤشر حالة (أخضر/أحمر) مع آخر وقت اختبار
- إضافة `action: 'test-connection'` في `zatca-api` — مجرد `fetch` لنقطة compliance بدون بيانات للتحقق من الوصول

### المهمة 3: إصلاح auto-detect clearance vs reporting
- في `ZatcaManagementPage.tsx` زر الإرسال يحدد الإجراء تلقائياً:
  - `invoice_type === 'standard'` → `clearance`
  - `invoice_type === 'simplified'` → `report`

### المهمة 4: إصلاح تفكيك Compliance Response
- توحيد بنية الرد بين ما يُعيده `zatca-api` وما يتوقعه `ZatcaManagementPage`
- التأكد أن `validationResults` تُمرر بشكل صحيح من ZATCA response

---

## ملخص الملفات

| الملف | العملية |
|-------|---------|
| `supabase/functions/zatca-api/index.ts` | تعديل (auto URL + test-connection + response fix) |
| `src/components/settings/ZatcaSettingsTab.tsx` | تعديل (قسم حالة الربط + اختبار) |
| `src/pages/dashboard/ZatcaManagementPage.tsx` | تعديل (auto clearance/reporting) |

