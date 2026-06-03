## نتيجة الفحص الفعلي — تصفية البنود قبل التخطيط

فحصت كل توصية من التقريرين الأخيرين (24 بنداً سابقاً + 12 مجموعة جديدة) بقراءة مباشرة للملفات. النتيجة:

### مُصلَح فعلاً — لن يُعاد العمل عليه

| البند | الحالة الفعلية |
|---|---|
| 1-12, 16-19, 24 من التقرير الأول | مُصلَحة (راجعتها سطراً سطراً) |
| `SwUpdateBanner.setInterval` cleanup | موجود `return () => { clearTimeout; clearInterval }` |
| JSON-LD في `Index.tsx` | يستخدم `safeJsonLdString` |
| CSV formula injection | `sanitizeCsvValue` موجود |
| `useDataExport` تنبيه 5000 | موجود (`uiNotify.warning`) |
| `logger` production silent | تصميم متعمَّد (موثّق في الملف) |
| `errorReporter` dedupe | موجود |
| ReactMarkdown raw HTML | react-markdown v8+ لا يعرض HTML افتراضياً |

### الأخطاء الحقيقية المتبقية — هذه ما سأنفّذه

---

## الموجة A — حسابات وبيانات حرجة (P0/P1)

### A1 — `usePropertiesViewPage.activeIncome` يستخدم مستحقات تعاقدية بدل دخل فعلي
- استبدال `Σ allocated_amount` بـ `Σ income.amount WHERE property_id` للسنة النشطة.
- السنة المقفلة تبقى `accounts.total_income` (الكود الحالي).
- إضافة جلب `useIncomeByFiscalYear`.
- `contractualRevenue` يبقى في بطاقة مستقلة بعنوان واضح.

### A2 — `collectionCompute.perPayment` يستخدم `||` بدل `??`
- السطر: `contract.payment_amount || rent/count` → عند `payment_amount === 0` يقع fallback صامت.
- التحويل إلى `??` لاكتشاف بيانات خاطئة (0 يبقى 0 وتنبيه عبر diagnostics).

### A3 — `availableAmount` من snapshot في multiYearHelpers + إضافة `net_after_zakat`
- Migration: تعديل RPC `get_multi_year_summary` لإرجاع `account.available_amount` و `account.net_after_zakat` (محسوبَين كـ `net_after_vat - zakat_amount`).
- تحديث `YearSummaryEntry` بإضافة `netAfterZakat`.
- تحديث `mapEntry` لاستخدام snapshot إن وُجد، fallback للحساب الحالي للسنوات النشطة.

### A4 — توحيد عرض الصافي كثلاث أعمدة منفصلة (قرار المستخدم)
- `useHistoricalComparison.comparisonRows`: عرض `netAfterExpenses` و `netAfterZakat` و `waqfRevenue` كصفوف مستقلة.
- `chartData`: استبدال خط "الصافي" المفرد بثلاثة خطوط.
- `useYearComparisonState`: نفس التحديث للسنتين + تحديث `generateYearComparisonPDF` و `generateMultiYearComparisonPDF`.

---

## الموجة B — أمان/تقارير/تواريخ (P1)

### B1 — حماية XLSX من Formula Injection
- إضافة `sanitizeXlsxCell` في `src/utils/export/xlsx.ts` تُسبق أي قيمة تبدأ بـ `= + - @ \t \r` بـ `'`.
- تطبيقها داخل `buildXlsx` عند `escXml(val)` للقيم النصية.
- اختبار `xlsx.test.ts` يثبت السلوك.

### B2 — تشديد Markdown صراحةً (defense in depth)
- في `SortableBylawItem.tsx` و `BylawsViewPage.tsx`: تمرير `disallowedElements={['script','iframe','style','object','embed']}` + `unwrapDisallowed`.
- توضيح في وصف الإدخال: "Markdown فقط — HTML غير مدعوم".

### B3 — sanitization لـ errorReporter PII
- إضافة `src/lib/diagnostics/sanitizeErrorMetadata.ts` يُنظّف:
  - `url`: إزالة query string وtokens
  - `stack`: قص إلى 1000 محرف + إخفاء absolute paths
  - `user_agent`: قص إلى 200 محرف
- تطبيقه قبل `log_access_event` في `reportClientError`.

### B4 — date-only helpers موحّدة
- إنشاء `src/utils/date/dateOnly.ts` يحتوي:
  - `todayLocalISO()` — YYYY-MM-DD بالتوقيت المحلي
  - `parseDateOnlyLocal(s)`
  - `compareDateOnly(a, b)`
  - `diffCalendarDays(a, b)`
- استبدال `new Date().toISOString().slice(0,10)` في `useOverdueSplit` و `collectionCompute` (السطر 178).
- اختبار شامل.

### B5 — diagnostics: فحوص مالية جديدة
- إضافة فحوص في `src/lib/diagnostics/checks.ts`:
  - `partially_paid && paid_amount < amount` معلّقة
  - `distributions_amount > available_amount` لكل سنة مقفلة
  - `fy.status='closed' && !account`
  - `allocations مجموعها 0 مع rent_amount > 0` (مفخخات)
  - `partially_paid && due_date < today` (متأخرات جزئية)

---

## الموجة C — وصول/أداء/تنظيف (P2)

### C1 — `BottomNav` skeleton أثناء تحميل الدور
- استبدال `BOTTOM_NAV_LINKS[role ?? 'beneficiary']` بـ `if (!role) return null` (أو skeleton).

### C2 — a11y: drag handle لـ bylaws
- في `SortableBylawItem.tsx`: إضافة `aria-label="مقبض السحب"` + الاعتماد على dnd-kit KeyboardSensor الموجود (تأكيد التهيئة في المكون الأب).

### C3 — `aria-label` للتبويبات الناقصة
- 7 ملفات تحتوي `TabsList` بدون `aria-label`. إضافة label عربي وصفي لكل واحدة.

### C4 — اختبار QuickActions ضد ACCOUNTANT_EXCLUDED_ROUTES
- اختبار: كل عنصر `QUICK_ACTIONS_BY_ROLE.accountant` ليس ضمن `ACCOUNTANT_EXCLUDED_ROUTES`.

### C5 — `CashFlowReport` performance
- استبدال 12 filter داخل loop ببناء `Map<month, {income, expenses}>` مرة واحدة.

---

## ترتيب التنفيذ (PR واحد متماسك)

```text
1. Migration: get_multi_year_summary + net_after_zakat + available_amount
2. Types: YearSummaryEntry.netAfterZakat
3. utils: mapEntry, sanitizeXlsxCell, dateOnly.ts, sanitizeErrorMetadata.ts
4. hooks: usePropertiesViewPage (income الفعلي), collectionCompute (??)
5. comparisons: useHistoricalComparison + useYearComparisonState + 2 PDFs (3 أعمدة)
6. UI: BottomNav skeleton, SortableBylawItem aria, Markdown disallowedElements, TabsList labels
7. errorReporter: تطبيق sanitization
8. diagnostics: 5 فحوص مالية + xlsx.test
9. CashFlowReport: month Map
10. Tests: 9 ملفات اختبار (Vitest)
11. `bunx vitest run` → 0 انحدار
```

## ما لن يُنفَّذ (مع الأسباب)

| البند | السبب |
|---|---|
| تغيير `logger` production console silent | تصميم متعمَّد موثّق |
| `pwa_just_updated` TTL | لا يوجد ضرر فعلي، يُمسح مع localStorage عادة |
| توحيد `usePwaInstall` و `useInstallAppPage` | refactor كبير بلا فائدة وظيفية فورية |
| تغيير fallback السنوي `monthsSinceStart >= 1` | سياسة تجارية — يحتاج قرار محاسبي صريح |
| إعادة تسمية ملفات PDF/CSV لاتفاقية موحدة | تجميلي، يُمكن لاحقاً |
| pagination كامل للتصدير | الحد 5000 + التنبيه كافٍ حالياً |
| تحويل `ReactMarkdown` lazy إلى eager | فائدة هامشية، Suspense يعمل |

## التحقق بعد التنفيذ

- `bunx vitest run` — كل الاختبارات تمر (الحالية 1904 + ~12 جديدة).
- مراجعة يدوية:
  - بطاقة "الدخل الفعلي" في صفحة العقارات.
  - جدول المقارنة التاريخية يعرض 3 أعمدة صافي.
  - تنزيل XLSX يحوي قيمة تبدأ بـ `=SUM(...)` — تظهر كنص لا كصيغة.
  - فتح التطبيق بدون دور — لا روابط مستفيد تومض.
- مراجعة logs بعد deploy: `access_log.metadata.error_stack` لا يحوي مسارات absolute.
