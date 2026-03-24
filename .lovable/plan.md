

# خطة الإصلاح — الجولة السابعة (بنود جديدة من التقرير الجنائي الثاني)

## ملخص التحقق

بعد فحص كل بند في التقرير مقابل الكود الفعلي الحالي:

### بنود مُصلحة فعلاً (لا تحتاج تدخل)

| البند | الحالة | السبب |
|-------|--------|-------|
| PaymentInvoicesTab clearSelection | ✅ مُصلح | `onClick={clearSelection}` موجود |
| CloseYearDialog disabled | ✅ مُصلح | `disabled={isClosing \|\| checklist.some(...)}` |
| InvoicesPage `=== 'all'` | ✅ مُصلح | الشرط يتضمن `h.fiscalYearId === 'all'` |
| DashboardAlerts truncation | ✅ مُصلح | `.slice(0, 3)` + "X آخرين" |
| ReportsPage try/catch | ✅ مُصلح | try/catch + toast موجود |
| AnnualReportPage handlePrint | ✅ مُصلح | يستخدم `handleExportPdf()` مع fallback |
| orphanedContracts limit | ✅ مُصلح | `limit(500)` + `staleTime: 60_000` |
| HistoricalComparisonPage empty state | ✅ مُصلح | حالة فارغة واضحة مع أيقونة ونص |
| PendingActionsTable zatcaOverflow | ✅ يعمل | يعرض "+ X فاتورة أخرى" في mobile وdesktop |
| AuditLogPage pagination | ✅ يعمل | server-side pagination مع `pageSize` |
| `netCashFlow` خاطئ | ❌ خطأ في التقرير | `netAfterExpenses - zakat - admin - waqif = waqfRevenue` — صحيح رياضياً |
| `beneficiaryPercentage` لا يُمرَّر | ❌ خطأ في التقرير | مُمرَّر فعلاً |
| `getSession()` في diagnostics | ❌ خطأ في التقرير | يستخدم `getUser()` |

### بنود جديدة قابلة للتنفيذ (5 إصلاحات)

---

## الإصلاحات المطلوبة

### 1. AiAssistant — لا يزال يستخدم `getSession()` (SEC-03 متبقي)

**الملف:** `src/components/AiAssistant.tsx` سطر 98
**المشكلة:** الكود يستخدم `(await supabase.auth.getSession()).data.session?.access_token` رغم أن التعليق يقول "invoke". هذا آخر استخدام لـ `getSession()` في المشروع.
**الإصلاح:** استبدال `fetch` المباشر بـ `supabase.functions.invoke()` الذي يُرسل الـ token تلقائياً. بما أن المساعد يحتاج streaming، يمكن استخراج الـ token من `getUser()` بدلاً من `getSession()`.

### 2. AdminDashboard — زر الطباعة `window.print()`

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 225
**المشكلة:** `window.print()` يطبع الصفحة كاملة بما فيها عناصر غير مطلوبة (CollectionHeatmap, pagePerformanceCard). الـ charts تختفي بدون بديل مفيد.
**الإصلاح:** إضافة CSS classes `print:hidden` للعناصر غير المطلوبة في الطباعة (CollectionHeatmap, pagePerformanceCard, ErrorBoundary/Charts section)، وإضافة `print:block` لعناصر ملخص بسيطة بدلاً من الرسوم البيانية.

### 3. DashboardAlerts — `collectionRate` قد يكون `undefined` بصرياً

**الملف:** `src/components/dashboard/DashboardAlerts.tsx`
**المشكلة:** إذا وصلت `collectionRate` بقيمة غير رقمية، يُعرض `undefined%`. حماية بسيطة مفقودة.
**الإصلاح:** تغليف العرض بـ `safeNumber(collectionRate)` أو التأكد من أن النص يستخدم `collectionRate ?? 0`.

### 4. AdminDashboard — `useDashboardRealtime` يُبطل كاش غير مرتبط

**الملف:** `src/hooks/ui/useDashboardRealtime.ts`
**المشكلة:** أي تغيير في `income` يُبطل كاش `payment_invoices` والعكس. الـ `invalidateQueries` تُطلق على كل جدول مستقل.
**الإصلاح:** تغيير المنطق ليُبطل فقط الـ queryKey المرتبط بالجدول الذي تغيّر (الجدول الذي أطلق الـ event).

### 5. FiscalYearWidget — `Math.min(100,...)` يخفي تجاوز الهدف

**الملف:** `src/components/dashboard/FiscalYearWidget.tsx`
**المشكلة بسيطة:** عند تجاوز الدخل للإيرادات التعاقدية، النسبة تُقطع عند 100% بدون إشارة. الناظر لا يعرف أنه تجاوز الهدف.
**الإصلاح:** إضافة badge صغير "تجاوز الهدف ✓" عند تجاوز 100%.

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AiAssistant.tsx` | استبدال `getSession()` بنمط آمن للـ streaming |
| `src/pages/dashboard/AdminDashboard.tsx` | إضافة `print:hidden` للعناصر غير المطلوبة |
| `src/components/dashboard/DashboardAlerts.tsx` | حماية `collectionRate` من `undefined` |
| `src/hooks/ui/useDashboardRealtime.ts` | إبطال الكاش المرتبط بالجدول المتغير فقط |
| `src/components/dashboard/FiscalYearWidget.tsx` | إشارة تجاوز الهدف |

---

## قرارات عدم التنفيذ

| البند | السبب |
|-------|-------|
| `Date.now()` في expiringContracts | العقود المنتهية قريباً تعتمد طبيعياً على اليوم الحالي — ليست مرتبطة بالسنة المالية |
| ErrorBoundary بدون retry | تحسين UX غير حرج — يتطلب تغيير معماري في ErrorBoundary |
| Diagnostics فحوصات إضافية (8 فحوصات) | مهمة كبيرة منفصلة تحتاج تخطيط مستقل |
| ZATCA check في CloseYearDialog | تحسين مستقبلي — الإقفال لا يمنع إرسال ZATCA لاحقاً |
| BeneficiariesPage distribute check | يتطلب تغيير في منطق العمل — الناظر يملك صلاحية مطلقة بتصميم مقصود |

