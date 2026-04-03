

# تقرير التدقيق البنيوي الشامل — الهندسة المعمارية والتنظيم

## التقييم العام

المشروع **جيد البنية** بشكل ملحوظ لحجمه (~78,500 سطر، 498+ ملف). النقاط التالية تحسينات تدريجية مرتبة من الأكثر أهمية.

---

## النتائج مرتبة حسب الأولوية

### 1. [حرج] Supabase Storage/DB داخل ملفات PDF Utility

**الملفات**: `src/utils/pdf/invoices/paymentInvoice.ts` (سطور 49-88)، `src/utils/pdf/invoices/invoice.ts` (سطور 89-98)

**المشكلة**: دوال توليد PDF تقوم بـ:
- رفع الملف إلى Storage
- تحديث `file_path` في قاعدة البيانات
- إظهار toast notifications

هذا يخالف فصل المسؤوليات — `utils/` يجب أن تكون دوال صرفة بدون آثار جانبية.

**التوصية**: دالة PDF تُرجع `Blob` فقط. الرفع والتحديث ينتقلان إلى `lib/services/invoiceStorageService.ts` (موجود أصلاً).

---

### 2. [حرج] Toast مباشر في 6 ملفات utils

**الملفات المتأثرة**:
- `utils/pdf/core/pdfFonts.ts`
- `utils/pdf/invoices/invoice.ts`
- `utils/pdf/invoices/invoices.ts`
- `utils/pdf/reports/annualReport.ts`
- `utils/printDistributionReport.ts`
- `utils/printShareReport.ts`

**المشكلة**: طبقة `utils/` تستورد `toast` من `sonner` مباشرة بدلاً من `lib/notify.ts`. هذا:
- يكسر قابلية الاختبار (تحتاج mock لـ sonner)
- يخلق تبعية UI في طبقة المنطق الصرف
- يتعارض مع نمط `AppNotify` المعتمد في بقية المشروع

**التوصية**: استبدال كل `toast.*` في `utils/` بـ callback أو إرجاع نتيجة (success/error) والسماح للطبقة المستدعية بإظهار الإشعار.

---

### 3. [حرج] Toast مباشر في `lib/auth/nationalIdLogin.ts`

12 استدعاء مباشر لـ `toast.*` في ملف auth logic. رغم وجود `lib/notify.ts` كتجريد موحّد.

**التوصية**: تمرير `AppNotify` كمعامل أو استخدام `defaultNotify` من `lib/notify.ts`.

---

### 4. [متوسط] حسابات في صفحة `AccountsPage.tsx` بدلاً من Hook

**سطور 30-41**: `usePaymentInvoices` + `useAdvanceRequests` + حسابات `useMemo` لـ `unpaidInvoices` و `pendingAdvances` موجودة في الصفحة. يجب أن تكون في `useAccountsPage` أو hook فرعي مخصص.

**التوصية**: نقل هذه الثلاث data hooks + الحسابات إلى `useAccountsPage` وإرجاع `unpaidInvoices` و `pendingAdvances` كخصائص.

---

### 5. [متوسط] Supabase مباشر في diagnostics utils

**الملفات**: `utils/diagnostics/checks/database.ts`، `utils/diagnostics/checks/zatca.ts`

يستوردان Supabase مباشرة. مقبول مؤقتاً لأنها أدوات تشخيص، لكن يخالف نمط المشروع.

**التوصية**: نقل الاستعلامات إلى `lib/services/diagnosticsService.ts` جديد.

---

### 6. [منخفض] `hooks/data/` — 77 ملفاً مسطحاً بدون تقسيم

مجلد واحد يضم كل data hooks. مع نمو المشروع يصعب العثور على الملف.

**التوصية**: تقسيم إلى مجلدات فرعية:
```text
hooks/data/
  contracts/   → useContracts, useWholePropertyRental
  invoices/    → useInvoices, usePaymentInvoices, useInvoiceFileUtils
  messaging/   → useMessaging, useBulkMessaging, useUnreadMessages
  settings/    → useAppSettings, useNotificationPreferences
  support/     → useSupportTickets, useSupportAnalytics
  zatca/       → useZatcaCertificates, useZatcaManagement
```
مع barrel `index.ts` في كل مجلد فرعي.

---

### 7. [منخفض] `lib/` vs `utils/` — حدود غير موثّقة

**القاعدة الضمنية الحالية**:
- `lib/` = منطق يتفاعل مع خدمات خارجية (Supabase, Auth, Realtime, Monitoring)
- `utils/` = دوال حسابية صرفة + PDF + تنسيق

لكنها غير موثّقة ويوجد تجاوزات (toast + supabase في utils).

**التوصية**: توثيق القاعدة في `src/utils/README.md` (موجود) وإضافة `src/lib/README.md`.

---

## نقاط القوة المؤكدة ✅

| الجانب | التقييم |
|--------|---------|
| **صفر Supabase في المكونات** | ممتاز — فصل تام |
| **TypeScript صارم** (3 `any` فقط، صفر `as any`) | ممتاز |
| **Lazy loading لكل الصفحات** | ممتاز |
| **CRUD موحد** (`useCrudFactory`) | ممتاز |
| **Logger مركزي** (صفر `console.*` مباشر) | ممتاز |
| **تقسيم الحزم** (jsPDF, Recharts معزولة) | ممتاز |
| **Financial hooks منظمة** (36 ملف في مجلد مستقل) | جيد جداً |
| **اختبارات** (test files بجانب الملفات) | جيد |
| **لا ملف يتجاوز 300 سطر** (خارج types/tests/UI) | جيد جداً |

---

## خطة التنفيذ المقترحة

| الترتيب | الوصف | الأثر | الجهد |
|---------|-------|-------|-------|
| 1 | استخراج منطق رفع PDF من `paymentInvoice.ts` و `invoice.ts` إلى service | عالي | متوسط |
| 2 | استبدال `toast` المباشر في 6 ملفات utils بنمط callback/result | عالي | منخفض |
| 3 | تحويل `nationalIdLogin.ts` لاستخدام `AppNotify` | متوسط | منخفض |
| 4 | نقل حسابات `unpaidInvoices`/`pendingAdvances` من `AccountsPage` إلى hook | متوسط | منخفض |
| 5 | نقل استعلامات diagnostics إلى service | منخفض | منخفض |
| 6 | تقسيم `hooks/data/` إلى مجلدات فرعية | منخفض | متوسط |
| 7 | توثيق حدود `lib/` vs `utils/` | منخفض | منخفض |

