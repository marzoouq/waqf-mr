

## الفحص الجنائي — الجولة الحادية عشرة (الدخل + المصروفات + PDF + التقارير: 34 بنداً)

### التحقق بند بند مقابل الكود الفعلي

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **IN-01** | لا CSV في IncomePage | **✅ مؤكد** — سطر 186: `ExportMenu onExportPdf` فقط. لا `onExportCsv`. بينما ExpensesPage سطر 169 لديه كلاهما | **نعم** |
| **IN-02** | `Number()` بدل `safeNumber()` | **✅ مؤكد** — سطر 110: `Number(item.amount)`. ExpensesPage سطر 114: `safeNumber(item.amount)`. تناقض مباشر | **نعم** |
| **IN-03** | lowIncomeMonths يخلط مصادر | **🟡 بالتصميم** — التنبيه مقصود لمراقبة الإجمالي الشهري. فصل المصادر = تعقيد بلا قيمة واضحة | لا |
| **IN-04** | نص تحميل بدل TableSkeleton | **✅ مؤكد** — سطر 297-298: `"جاري التحميل..."` نص ثابت. ExpensesPage سطر 222-223: `<TableSkeleton rows={5} cols={5} />` | **نعم** |
| **IN-05** | نموذج الدخل inline | **🟡 تجميلي** — 15 سطراً داخل Dialog. ليس كبيراً بما يكفي لاستخراجه الآن | لا (DEFER-34) |
| **IN-06** | avg = لكل سجل وليس شهرياً | **🟡 مقبول** — البطاقة تقول "متوسط الدخل" وليس "متوسط الدخل الشهري". القيمة صحيحة للسياق | لا |
| **EX-01** | حذف لا يُعيد currentPage | **✅ مؤكد** — سطر 89-96: `handleConfirmDelete` بلا `setCurrentPage(1)`. نفس مشكلة BP-04 | **نعم** |
| **EX-02** | PDF كل vs CSV مفلتر | **✅ مؤكد** — سطر 169: `generateExpensesPDF(expenses,...)` vs `buildCsv(filteredExpenses.map(...))` | **نعم** |
| **EX-03** | PieChart مع expenses=[] | **🟡 مقبول** — `ExpensesPieChart` يتعامل داخلياً مع `expenses.length === 0` ويعرض "لا توجد بيانات" | لا |
| **EX-04** | ITEMS_PER_PAGE داخل component | **🟡 تجميلي** — `const` لا يُعاد تعريفه في كل render (JavaScript hoisting). تحسين نظري فقط | لا |
| **RP-01** | invalidateQueries() بلا queryKey | **✅ مؤكد** — FinancialReportsPage سطر 40. نفس مشكلة MS-01 تماماً | **نعم** |
| **RP-02** | PDF المستفيد يعرض حصته فقط | **🟡 بالتصميم** — المستفيد لا يجب أن يرى حصص المستفيدين الآخرين (خصوصية). عرض حصته فقط = صحيح | لا |
| **RP-03** | REPORT_COLORS بـ CSS vars | **🟡 نظري** — تُستخدم في Recharts فقط (SVG) وليس PDF. لا خطر حالي | لا |
| **RP-04** | 4 أزرار تصدير | **🟡 تجميلي** — الأزرار تستخدم `hidden sm:inline` لإخفاء النص على الموبايل. مقبول بصرياً | لا (DEFER-35) |
| **RP-05** | alias PieChart/RePieChart | **🟡 تجميلي بحت** — لا يؤثر على السلوك | لا |
| **RP-06** | لا مقارنة سنوية واضحة | **❌ موجودة** — `YearOverYearComparison` مستوردة ومُستخدمة في تبويب "other" | لا |
| **ST-01** | 11 استدعاء Supabase لكل حفظ | **🟡 مؤجل** — يتطلب إعادة هيكلة SettingsPage. تأثير الأداء ضئيل (11 upsert صغيرة) | لا (DEFER-36) |
| **ST-02** | نسبة 0% بلا تحذير | **🟡 مقبول** — حالة استخدام شرعية (الناظر يتنازل عن حصته) | لا |
| **ST-03** | حقل fiscal_year في إعدادات | **🟡 legacy** — يُستخدم كعنوان عام فقط، ليس بديلاً لجدول FiscalYears | لا |
| **ST-04** | Suspense غير متسق | **🟡 تجميلي** — التبويبات بدون Suspense صغيرة الحجم | لا |
| **ST-05** | لا audit log للنسب المالية | **🟡 مؤجل** — يتطلب تغيير DB (trigger) + UI. تغيير معقد | لا (DEFER-37) |
| **PDF-01** | toLocaleString() بلا locale في PDF | **✅ مؤكد** — expenses.ts سطر 27: `Number(item.amount).toLocaleString()` بدون locale. وسطر 60 كذلك. سطر 31: `total.toLocaleString()` بدون locale | **نعم** |
| **PDF-02** | أرقام هندية تُعكس في PDF | **❌ خاطئ** — `reverseBidi` يعكس **ترتيب الكلمات** فقط وليس الحروف داخل الكلمة. الأرقام ككتلة واحدة تبقى بترتيبها الصحيح. مثال: `"مبلغ ١٢٣"` → `"١٢٣ مبلغ"` = عرض RTL صحيح. الأرقام لا تُعكس أبداً | لا |
| **PDF-03** | اسم ملف PDF ثابت | **✅ مؤكد** — `income-report.pdf` و`expenses-report.pdf` ثابتان | **نعم** (بسيط) |
| **PDF-04** | window.open بلا popup blocked | **🟡 حالة حدية** — Safari يسمح بـ synchronous `window.open`. الكود مزامن = يعمل | لا |
| **PDF-05** | لا ترقيم صفحات | **❌ خاطئ تماماً** — core.ts سطر 256: `doc.text(\`${i} / ${pageCount}\`, ...)` في `addFooter`. ترقيم الصفحات **موجود ويعمل** على كل صفحة | لا |
| **PDF-06** | addHeaderToAllPages مفقودة | **❌ خاطئ** — expenses.ts سطر 38/71: `addHeaderToAllPages(doc, fontFamily, waqfInfo)` موجودة في كلا الدالتين | لا |
| **PDF-07** | netRevenue مختلف بين المستفيد والناظر | **❌ خاطئ** — ReportsPage سطر 63: `netRevenue = netAfterZakat`. FinancialReportsPage سطر 104: `netRevenue: netAfterZakat`. **نفس القيمة بالضبط** | لا |
| **PDF-08** | لا watermark مسودة | **🟡 تحسين مستقبلي** — إضافة جوهرية وليست إصلاح خطأ | لا (DEFER-38) |
| **NUM-01** | Number() vs safeNumber() | **✅ = IN-02** — نفس المشكلة، تكرار | يُصلح مع IN-02 |
| **NUM-02** | toLocaleString بلا locale في 6 مواقع | **✅ مؤكد جزئياً** — IncomePage سطور الجدول تستخدم `Number(item.amount).toLocaleString()` بلا locale. ExpensesPage سطر 253/302 كذلك | **نعم** |
| **NUM-03** | myShare يُحسب في مكانين | **✅ مؤكد** — BeneficiaryDashboard سطر 239: `myShare.toLocaleString()` يأتي من `useMyShare` hook ✅. لكن سطر 239 يستخدم `toLocaleString()` بلا locale | يُصلح مع NUM-02 |
| **NUM-04** | تكرار حساب myShare | **❌ تم إصلاحه** — BeneficiaryDashboard يستخدم `useMyShare` الآن (من إصلاحات سابقة) | لا |
| **IMPROVE-01-08** | 8 تحسينات جوهرية | **💡 مؤجلة** — إضافات ميزات وليست إصلاح أخطاء | لا (DEFER) |

---

### الإصلاحات المطلوبة — 9 تغييرات في 4 ملفات

#### الملف 1: `src/pages/dashboard/IncomePage.tsx`

**IN-01**: إضافة `onExportCsv` لـ ExportMenu (سطر 186) — استيراد `buildCsv`, `downloadCsv`, `safeNumber` وتصدير `filteredIncome` كـ CSV

**IN-02**: سطر 110 — استبدال `Number(item.amount)` بـ `safeNumber(item.amount)`. أيضاً سطور 124, 139, 168 تستخدم `Number()` — توحيدها جميعاً لـ `safeNumber()`

**IN-04**: سطر 297-298 — استبدال نص "جاري التحميل..." بـ `<TableSkeleton rows={5} cols={5} />`

**NUM-02 (جزئي)**: سطور الجدول (mobile + desktop) تستخدم `Number(item.amount).toLocaleString()` — تغييرها لـ `safeNumber(item.amount).toLocaleString('ar-SA')`

#### الملف 2: `src/pages/dashboard/ExpensesPage.tsx`

**EX-01**: سطر 93 — إضافة `setCurrentPage(1)` بعد `setDeleteTarget(null)`

**EX-02**: سطر 169 — توحيد PDF ليُصدّر `filteredExpenses` (مثل CSV) بدل `expenses`

**NUM-02 (جزئي)**: سطر 253, 302 — تغيير `Number(item.amount).toLocaleString()` لـ `safeNumber(item.amount).toLocaleString('ar-SA')`

#### الملف 3: `src/pages/beneficiary/FinancialReportsPage.tsx`

**RP-01**: سطر 40 — تحديد queryKeys:
```typescript
const handleRetry = () => {
  queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
  queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
};
```

#### الملف 4: `src/utils/pdf/expenses.ts`

**PDF-01**: سطور 27, 31, 60, 64 — إضافة `'ar-SA'` لكل `toLocaleString()`

**PDF-03**: سطر 40: `income-report.pdf` → `income-report-${new Date().toISOString().slice(0,10)}.pdf`
سطر 73: `expenses-report.pdf` → `expenses-report-${new Date().toISOString().slice(0,10)}.pdf`

---

### بنود مدحوضة بارزة

| # | الادعاء | الحقيقة |
|---|---------|---------|
| **PDF-02** | أرقام هندية تُعكس في PDF | `reverseBidi` يعكس ترتيب الكلمات فقط — الأرقام كوحدة واحدة لا تُعكس |
| **PDF-05** | لا ترقيم صفحات | `addFooter` في core.ts سطر 256 يُضيف `i / pageCount` لكل صفحة |
| **PDF-06** | addHeaderToAllPages مفقودة | موجودة في expenses.ts سطر 38 و71 |
| **PDF-07** | netRevenue مختلف بين المستفيد والناظر | كلاهما يُمرر `netAfterZakat` بالضبط |

---

### بنود مؤجلة جديدة

| # | الوصف | الأولوية |
|---|-------|---------|
| DEFER-34 | استخراج IncomeFormDialog كمكوّن مستقل | منخفضة |
| DEFER-35 | دمج أزرار التصدير في ReportsPage | منخفضة |
| DEFER-36 | تحسين أداء حفظ الإعدادات (batch upsert) | منخفضة |
| DEFER-37 | Audit log لتغييرات النسب المالية | متوسطة |
| DEFER-38 | Watermark "مسودة" لـ PDF السنوات النشطة | متوسطة |

---

### ملخص التأثير

- **4 ملفات** تُعدَّل
- لا تغييرات DB
- من أصل 34 بنداً: **9 للإصلاح**, **5 مؤجلة**, **20 مدحوضة/بالتصميم/تجميلية**
- أبرز المدحوضات: **PDF-02** (الأرقام لا تُعكس)، **PDF-05** (ترقيم الصفحات موجود)، **PDF-07** (القيم متطابقة)

