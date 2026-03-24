

# خطة الإصلاح — الجولة السادسة (التقرير الجنائي الشامل)

---

## تحليل التقرير مقابل الكود الفعلي

بعد فحص كل بند، إليك التصنيف الحقيقي:

### بنود التقرير الخاطئة أو المُصلحة فعلاً

| البند | الحكم | السبب |
|-------|-------|-------|
| **البند 6** — `netCashFlow` خاطئ | **تقرير خاطئ** | المعادلة: `netAfterExpenses - adminShare - waqifShare - zakat` = `netAfterZakat - adminShare - waqifShare` = `waqfRevenue` تماماً. من `accountsCalculations.ts` سطر 94: `waqfRevenue = netAfterZakat - adminShare - waqifShare`. لا يوجد خصم مضاعف |
| **البند 1-ب** — `beneficiaryPercentage` لا يُمرَّر | **تقرير خاطئ** | `AccountsPage.tsx` سطر 245 يُمرر `beneficiaryPercentage={totalBenPct}` بوضوح |
| **البند 2 (diagnostics)** — `getSession()` محظور | **تقرير خاطئ** | `checks.ts` لا يحتوي `getSession()` إطلاقاً — تم البحث ولم يُوجد |
| **SEC-01/02/03/04, HI-01..07, MED-01..10** | **مُصلحة في الجولات 4-5** | تم التحقق سابقاً |

---

## البنود القابلة للتنفيذ (10 إصلاحات حقيقية)

### 🔴 فوري

**1. PaymentInvoicesTab — زر إلغاء التحديد لا يعمل**
- الملف: `src/components/contracts/PaymentInvoicesTab.tsx` سطر 210
- `onClick={() => {}}` ← فارغ تماماً
- الإصلاح: يُستدعى `setSelectedIds` من الـ hook — لكن `setSelectedIds` غير مُصدَّر مباشرة. الحل: تصدير دالة `clearSelection` من `usePaymentInvoicesTab` واستدعاؤها

**2. CloseYearDialog — الـ checklist لا يمنع الإقفال**
- الملف: `src/components/accounts/CloseYearDialog.tsx` سطر 92
- `disabled={isClosing}` فقط — لا يتحقق من `hasErrors`
- الإصلاح: حساب `hasErrors` من الـ `checklist` وإضافته لـ `disabled`

**3. InvoicesPage — تحذير "جميع السنوات" لا يظهر**
- الملف: `src/pages/dashboard/InvoicesPage.tsx` سطر 59
- `if (!h.fiscalYearId)` — القيمة `'all'` هي truthy فلا يتحقق الشرط
- الإصلاح: `if (!h.fiscalYearId || h.fiscalYearId === 'all')`

**4. AiAssistant — آخر `getSession()` متبقي**
- الملف: `src/components/AiAssistant.tsx` سطر 92
- لا يزال يستخدم `getSession()` رغم إصلاح الملفات الأربعة الأخرى في الجولة 5
- الإصلاح: استخدام `supabase.functions.invoke()` أو استخراج token من `getUser()` response

### 🟠 هذا الأسبوع

**5. DashboardAlerts — قائمة عقود طويلة تكسر Layout**
- الملف: `src/components/dashboard/DashboardAlerts.tsx` سطر 75
- `.join('، ')` بدون truncation
- الإصلاح: عرض أول 3 عقود + `و X آخرين`

**6. ReportsPage — Forensic Audit PDF بدون error handling**
- الملف: `src/pages/dashboard/ReportsPage.tsx` سطر 221-224
- لا يوجد `try/catch` ولا loading state
- الإصلاح: إضافة `try/catch` مع `toast.error` و loading state على الزر

**7. AnnualReportPage — `window.print()` يطبع tab واحد**
- الملف: `src/pages/dashboard/AnnualReportPage.tsx` سطر 135
- الإصلاح: استبدال بـ `generateAnnualReportPDF()` الموجودة فعلاً

**8. orphanedContracts — `limit(50)` + `staleTime` طويل**
- الملف: `src/pages/dashboard/AdminDashboard.tsx` سطر 87
- الإصلاح: رفع إلى `limit(500)` وتقليل `staleTime` إلى 60 ثانية

**9. HistoricalComparisonPage — بدون empty state**
- إضافة حالة فارغة واضحة عند عدم وجود سنوات مقفلة

**10. PendingActionsTable — `zatcaOverflow` قد لا يُعرض**
- التحقق من عرض عدد الفواتير المتبقية بوضوح

---

## لن يُعدَّل

| البند | السبب |
|-------|-------|
| `netCashFlow` (بند 6) | **المعادلة صحيحة** — تساوي `waqfRevenue` تماماً |
| `beneficiaryPercentage` (بند 1-ب) | **مُمرَّر فعلاً** في سطر 245 |
| `getSession` في diagnostics (بند 2) | **غير موجود** في الكود |
| `collectionRate undefined` (بند 2) | `collectionSummary.percentage` يُرجع `0` وليس `undefined` — حماية موجودة |
| `FiscalYearWidget` (بند 4) | `Math.min(100,...)` سلوك مقصود — تجاوز 100% لا يحتاج تحذير في widget مختصر |
| `ErrorBoundary` بدون retry (بند 5) | تحسين UX غير حرج |
| `Date.now()` في expiringContracts (بند 7) | العقود المنتهية قريباً تعتمد على التاريخ الحالي بطبيعتها — ليست مرتبطة بالسنة المالية |
| Realtime debounce (بند 9) | تحسين أداء — `invalidateQueries` لا يُعيد الرسم فوراً بل يُبطل الكاش فقط |
| ZATCA check في CloseYearDialog (بند 1-ج) | تحسين مستقبلي — الإقفال لا يمنع إرسال ZATCA لاحقاً |
| AuditLog pagination (بند 10) | الاستعلام يعتمد على RLS + Supabase default limit 1000 — كافٍ حالياً |
| Diagnostics فحوصات إضافية (بند 2) | مهمة منفصلة كبيرة |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/page/usePaymentInvoicesTab.ts` | تصدير `clearSelection` |
| `src/components/contracts/PaymentInvoicesTab.tsx` | ربط `clearSelection` بزر X |
| `src/components/accounts/CloseYearDialog.tsx` | `disabled={isClosing \|\| hasErrors}` |
| `src/pages/dashboard/InvoicesPage.tsx` | إضافة `=== 'all'` للشرط |
| `src/components/AiAssistant.tsx` | إزالة `getSession()` |
| `src/components/dashboard/DashboardAlerts.tsx` | truncate قائمة العقود |
| `src/pages/dashboard/ReportsPage.tsx` | try/catch + loading للـ PDF |
| `src/pages/dashboard/AnnualReportPage.tsx` | استبدال `window.print()` |
| `src/pages/dashboard/AdminDashboard.tsx` | رفع limit + تقليل staleTime |
| `src/pages/dashboard/HistoricalComparisonPage.tsx` | إضافة empty state |

