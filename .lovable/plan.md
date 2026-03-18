

# تصحيح التقرير + خطة التنفيذ

## تصحيح الادعاءات — الحالة الحقيقية بالكود

| البند | الادعاء | الحقيقة |
|-------|---------|---------|
| R1 `overdue` مفقودة | ❌ خطأ | ✅ موجودة سطر 47 في `useInvoices.ts` |
| R2 `fiscalYear` غير مستخرج | ❌ خطأ | ✅ سطر 29: `const { fiscalYearId, noPublishedYears, fiscalYear } = useFiscalYear()` |
| R3 `.toLocaleString()` بلا locale | ❌ خطأ | ✅ يستخدم `fmt()` من `format.ts` الذي يُحدد `'en-US'` |
| R4 `overdue` badge رمادية | ❌ خطأ | ✅ سطر 51: `status === 'overdue'` يُرجع `'destructive'` (أحمر) |
| R5 `fmtDate`/`fmtDateTime` مفقودتان | ❌ خطأ | لا يوجد أي كود يستدعيهما — غير مطلوبتين |
| R6 `fmtAr` بلا تحقق | ❌ خطأ | لا يوجد أي ملف يستورد `fmtAr` — alias ميت |
| P1 تقسيم AdminDashboard | ❌ خطأ | ✅ المكونات الخمسة موجودة ومستوردة (سطور 28-34) |
| P2 KPI مفقودان | ❌ خطأ | ✅ `netCashFlow` سطر 146 + `distributionRatio` سطر 150 |
| P3 بطاقة السلفة | ❌ خطأ | ✅ موجودة سطر 322 في `BeneficiaryDashboard.tsx` |
| P4 تصنيف الإعدادات | ❌ خطأ | ✅ `SETTINGS_CATEGORIES` موجود (15 مرجع) |
| S2 لا إشعار قبل الجلسة | ❌ خطأ | ✅ `IdleTimeoutWarning` موجود ومُدمج |
| A7 بحث عالمي مفقود | ❌ خطأ | ✅ `GlobalSearch` موجود ومُدمج في `DashboardLayout` |
| D2 CollectionHeatmap مخفي | ❌ خطأ | ✅ مُستدعى في `AdminDashboard` سطر 352 |

**خلاصة: ~90% من التقرير غير دقيق.** معظم الميزات "المفقودة" مُنفذة فعلاً.

---

## ما هو مفقود فعلاً (مُثبت)

| # | البند | الحالة |
|---|-------|--------|
| 1 | صفحة `HistoricalComparisonPage` | ❌ غير موجودة — لا route ولا ملف |
| 2 | `ZatcaManagementPage` (795 سطر) — ملف ضخم بلا تقسيم | ✅ مؤكد |
| 3 | `SupportDashboardPage` (836 سطر) — ملف ضخم بلا تقسيم | ✅ مؤكد |
| 4 | `fmtAr` alias ميت في `format.ts` | ✅ يمكن حذفه (لا مستهلك) |

---

## خطة التنفيذ — 3 مهام حقيقية

### المهمة 1: صفحة المقارنة التاريخية

**ملف جديد:** `src/pages/dashboard/HistoricalComparisonPage.tsx`
- منتقي متعدد للسنوات (2-4) من `useFiscalYears`
- لكل سنة مختارة: استدعاء `useFinancialSummary` لجلب البيانات
- جدول مقارنة: الدخل، المصروفات، الصافي، حصة الناظر، حصة الواقف، ريع الوقف — عمود لكل سنة
- نسب التغيير بين السنوات مع أسهم ملونة (أخضر للنمو، أحمر للانخفاض)
- رسم بياني شريطي متعدد (recharts `BarChart` مع `Bar` لكل سنة)
- زر تصدير PDF (يعيد استخدام `generateComparisonPDF` الموجود)

**تعديلات:**
- `App.tsx`: إضافة route `/dashboard/comparison` مع `ProtectedRoute` لـ admin + accountant
- `constants.ts`: إضافة رابط في `allAdminLinks` + `linkLabelKeys`

### المهمة 2: تقسيم `ZatcaManagementPage` (795 سطر)

استخراج 4 مكونات فرعية إلى `src/components/zatca/`:

| الملف الجديد | المحتوى |
|-------------|---------|
| `ZatcaSummaryCards.tsx` | بطاقات الملخص (مُرسلة، لم تُرسل، مرفوضة، حالة الشهادة) |
| `ZatcaInvoicesTab.tsx` | تبويب الفواتير: جدول + أزرار إجراءات + فلتر + ترقيم |
| `ZatcaCertificatesTab.tsx` | تبويب الشهادات: دورة العمل + التسجيل/الترقية |
| `ZatcaChainTab.tsx` | تبويب سلسلة التوقيع |

`ZatcaManagementPage.tsx` يبقى كـ orchestrator يحتوي الـ hooks والـ state ويمرر props.

### المهمة 3: تقسيم `SupportDashboardPage` (836 سطر)

استخراج 4 مكونات إلى `src/components/support/`:

| الملف الجديد | المحتوى |
|-------------|---------|
| `SupportStatsCards.tsx` | بطاقات الإحصائيات |
| `SupportTicketsTab.tsx` | تبويب التذاكر + بحث + فلاتر + جدول |
| `SupportErrorsTab.tsx` | تبويب الأخطاء + بحث + جدول |
| `SupportAnalyticsTab.tsx` | تبويب الإحصائيات المتقدمة |

`SupportDashboardPage.tsx` يبقى كـ orchestrator.

### تنظيف صغير
- حذف `fmtAr` من `format.ts` (لا مستهلك)

---

## ملخص الملفات

| الملف | نوع |
|-------|-----|
| `HistoricalComparisonPage.tsx` | جديد |
| `App.tsx` | تعديل (route) |
| `constants.ts` | تعديل (رابط) |
| `ZatcaSummaryCards.tsx` | جديد |
| `ZatcaInvoicesTab.tsx` | جديد |
| `ZatcaCertificatesTab.tsx` | جديد |
| `ZatcaChainTab.tsx` | جديد |
| `ZatcaManagementPage.tsx` | تقليص |
| `SupportStatsCards.tsx` | جديد |
| `SupportTicketsTab.tsx` | جديد |
| `SupportErrorsTab.tsx` | جديد |
| `SupportAnalyticsTab.tsx` | جديد |
| `SupportDashboardPage.tsx` | تقليص |
| `format.ts` | حذف alias ميت |

**إجمالي: 14 ملف (9 جديدة + 5 معدّلة)**

