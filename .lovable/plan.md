

# فحص جنائي: مشكلة Proxy Error 500 + أداء `dashboard-summary`

## نتائج الفحص

### ما تم فحصه فعليًا
| العنصر | النتيجة |
|---|---|
| سجلات الكونسول (console logs) | فارغة — لا أخطاء |
| أخطاء وقت التشغيل (runtime errors) | لا شيء |
| طلبات الشبكة الفاشلة | لا نتائج (المستخدم على `/dashboard/beneficiaries` — لا تستدعي `dashboard-summary`) |
| سجلات Edge Function `dashboard-summary` | فقط `booted (time: 26ms)` — **لا يوجد أي log آخر** |
| CORS (`_shared/cors.ts`) | سليم — preview origin مطابق |
| كود `dashboard-summary/index.ts` | 250 سطر، بنية واضحة |

### التشخيص الجنائي

**المشكلة ليست CORS ولا كود خاطئ — بل timeout بسبب حجم العمل:**

1. **3 جولات تسلسلية قبل `Promise.all`:**
   - الجولة 1: `getUser()` + `req.json()` ← ~200ms
   - الجولة 2: `user_roles` + `check_rate_limit` ← ~200-400ms  
   - الجولة 3: `fiscal_years` **وحدها** ← ~200-300ms (لحساب `prevFiscalYear`)

2. **14 استعلامًا بالتوازي — بعضها ثقيل جدًا:**
   - `contracts`: **25 عمودًا + join مزدوج** (سطر 107) — يجلب `tenant_id_number, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, notes, updated_at` وكلها **غير مستخدمة** في الداشبورد
   - `payment_invoices`: **18 عمودًا + join مزدوج** (سطر 123) — يجلب `zatca_uuid, zatca_status, file_path, vat_rate, vat_amount, notes, updated_at` وكلها **غير مستخدمة**
   - `advance_requests`: `select("*")` مع joins — الداشبورد يحتاج فقط `id, status, amount`

3. **YoY يجلب آلاف السجلات بدل رقمين:**
   - سطر 194-209: يجلب **كل سجلات** الإيرادات والمصروفات للسنة السابقة (حتى 4000 سجل)
   - العميل يحسب `SUM(amount)` فقط — يمكن حسابه على الخادم

4. **`fiscal_years` في جولة مستقلة** (سطر 67-71) تُعيق البدء المتوازي — لا حاجة لها مسبقًا إذا نقلنا YoY لاستعلام مجمّع

### لماذا السجلات فارغة؟
- الوظيفة لا تحتوي على **أي timing logs** — فقط `console.error` في catch
- عند timeout، الحاوية تُقتل قبل الوصول لـ catch → لا يظهر شيء في السجلات

---

## خطة الإصلاح — 5 تعديلات في ملفين

### ملف 1: `supabase/functions/dashboard-summary/index.ts`

**تعديل أ — دمج `fiscal_years` في `Promise.all` الكبير:**
- نقل استعلام `fiscal_years` (سطر 67-71) إلى داخل `Promise.all` الرئيسي
- حساب `prevFiscalYear` بعد الجلب
- جلب YoY في جولة ثانية صغيرة فقط إذا وُجدت سنة سابقة
- **يحذف جولة كاملة** (~200-300ms)

**تعديل ب — تقليص أعمدة `contracts`:**
- حذف 10 أعمدة غير مستخدمة: `tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, notes, updated_at`
- تخفيف join: `property:properties(id, property_number), unit:units(id, unit_number, status)`

**تعديل ج — تقليص أعمدة `payment_invoices`:**
- حذف: `zatca_uuid, zatca_status, file_path, vat_rate, vat_amount, notes, updated_at`

**تعديل د — YoY server-side aggregation:**
- بدل جلب كل السجلات، جلب `amount` فقط وحساب المجموع في الكود:
  ```ts
  // بدلاً من جلب 2000 سجل كامل:
  admin.from("income").select("amount").eq("fiscal_year_id", prevId)
  ```
- إرجاع `prev_year` كأرقام: `{ fiscal_year_id, label, total_income, total_expenses }`

**تعديل هـ — إضافة timing logs:**
- `performance.now()` حول كل جولة للمراقبة المستقبلية

### ملف 2: `src/hooks/page/useDashboardSummary.ts`

- تعديل `DashboardSummaryResponse.prev_year` من مصفوفات إلى أرقام:
  ```ts
  prev_year: {
    fiscal_year_id: string;
    label: string;
    total_income: number;
    total_expenses: number;
  } | null;
  ```
- تبسيط حساب `yoy` — لم يعد يحتاج `computeTotals`، يقرأ الأرقام مباشرة

## التأثير المتوقع

| التحسين | التوفير |
|---|---|
| حذف جولة `fiscal_years` | ~200-300ms |
| تقليص `contracts` 10 أعمدة | ~300-800ms |
| تقليص `payment_invoices` 7 أعمدة | ~200-500ms |
| YoY أرقام بدل 4000 سجل | ~500-2000ms |
| **المجموع** | **~1.2-3.6 ثانية** |

**من ~9.5 ثانية إلى ~2-3 ثوانٍ** — تحت حد الـ timeout → **لا مزيد من proxy error 500**.

