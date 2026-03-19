

## خطة شاملة لتحسين الأداء (LCP · CLS · INP · Cache · Charts · Forms)

### ملخص المشاكل المكتشفة بعد مراجعة كامل التطبيق

| # | المشكلة | الملفات المتأثرة | التأثير |
|---|---------|-----------------|---------|
| 1 | LCP = 30 ث — H1 ينتظر `app_settings` API + خطوط بدون preload | `index.html`, `useAppSettings.ts`, `Index.tsx` | حرج |
| 2 | CLS = 0.55 — عناصر زخرفية blur + BetaBanner يزيح المحتوى | `Index.tsx`, `Auth.tsx`, `BetaBanner.tsx` | حرج |
| 3 | Charts width = -1 — حاويات بدون `minWidth: 0` | 5 ملفات charts | متوسط |
| 4 | حقول Input بدون `id`/`name` | ~50 ملف | منخفض |
| 5 | صورة splash كبيرة (512x512 → 80x80) | `index.html` | منخفض |

---

### التغييرات المطلوبة

#### 1. `index.html` — Preconnect + Font Preload + Splash
- إضافة `<link rel="preconnect" href="https://nuzdeamtujezrsxbvpfi.supabase.co" crossorigin>` قبل أي script
- إضافة `<link rel="preload">` لخطي Tajawal الحرجين (Regular-arabic + Bold-arabic woff2) بـ `as="font" crossorigin`
- تصغير صورة splash: استبدال `<img src="/pwa-512x512.png" width="80">` بأيقونة SVG inline بسيطة (توفير 14 KiB)

#### 2. `src/hooks/useAppSettings.ts` — PlaceholderData فورية
- إضافة `placeholderData` لـ `useQuery` بكائن فارغ `{}` حتى يعرض H1 القيم الافتراضية فوراً بدون انتظار الشبكة
- هذا يُزيل السبب الرئيسي لـ LCP = 30 ثانية (سلسلة: JS → Supabase client → app_settings API → render H1)

#### 3. `src/pages/Index.tsx` — إصلاح CLS + LCP
- **العناصر الزخرفية blur** (سطر 125-126): إضافة `contain: layout style` لمنع إعادة حساب التخطيط
- **إضافة `placeholderData` لـ stats query** (سطر 44): تمرير `placeholderData` بقيم صفرية حتى لا يظهر Skeleton ثم يتحول لمحتوى
- **إزالة `fetchPriority="high"` من صورة الشعار** (سطر 132): الشعار ليس عنصر LCP — يُبطئ تحميل الخطوط

#### 4. `src/pages/Auth.tsx` — إصلاح CLS
- **العناصر الزخرفية blur** (سطر 124-125): إضافة `contain: layout style` كما في Index
- هذه العناصر هي أكبر مسبب CLS (0.55) حسب التقرير

#### 5. `src/components/BetaBanner.tsx` — إصلاح CLS
- البانر يظهر متأخراً (ينتظر `app_settings`) ويزيح كل المحتوى تحته
- **الحل**: إضافة `min-height` محجوزة في الحاوي الأب، أو استخدام `transform` بدلاً من الإزاحة العادية عند الظهور في الأعلى

#### 6. إصلاح Charts (5 ملفات) — إضافة `minWidth: 0` + `style={{ minWidth: 0 }}`

| الملف | الحالة الحالية | التغيير |
|-------|---------------|---------|
| `MonthlyPerformanceReport.tsx` (سطر 134, 163) | ❌ بدون minWidth | إضافة `style={{ minWidth: 0 }}` للحاوي |
| `IncomeComparisonChart.tsx` (سطر 36) | ❌ بدون minWidth | إضافة `style={{ minWidth: 0 }}` للحاوي |
| `ReportsChartsInner.tsx` (سطر 26, 43) | ❌ بدون minWidth | إضافة `style={{ minWidth: 0 }}` للحاوي + `minWidth={0}` لـ ResponsiveContainer |
| `ExpensePieChartInner.tsx` (سطر 26) | ❌ بدون minWidth | لف بـ div مع `style={{ minWidth: 0 }}` |
| `DashboardCharts.tsx` | ✅ تم إصلاحه سابقاً | لا تغيير |
| `WaqifChartsInner.tsx` | ✅ تم إصلاحه سابقاً | لا تغيير |
| `YearOverYearComparison.tsx` | ✅ تم إصلاحه سابقاً | لا تغيير |
| `IncomeMonthlyChart.tsx` | ✅ تم إصلاحه سابقاً | لا تغيير |

#### 7. حقول Input بدون id/name — الحقول الحرجة فقط
- التركيز على حقول كلمات المرور والبيانات الحساسة (autofill مهم):
  - `InvoicesPage.tsx` — حقول رقم الفاتورة والمبلغ والتاريخ والبحث
  - `ExpensesPage.tsx` — حقل البحث
  - `BylawsPage.tsx` — حقل البحث + حقول النموذج (6 حقول)
- الملفات التي تم إصلاحها سابقاً: `UserManagementPage`, `ContractFormDialog`, `SupportDashboardPage`, `AiAssistant` — لا تغيير

---

### النتيجة المتوقعة
- **LCP**: من 30 ث → أقل من 4 ث
- **CLS**: من 0.55 → أقل من 0.1
- **تحذيرات Chart width**: تُزال من 4 ملفات إضافية
- **تحذيرات Form fields**: تُزال من الحقول الحرجة

### الملفات المعدّلة (11 ملف)
`index.html` · `useAppSettings.ts` · `Index.tsx` · `Auth.tsx` · `BetaBanner.tsx` · `MonthlyPerformanceReport.tsx` · `IncomeComparisonChart.tsx` · `ReportsChartsInner.tsx` · `ExpensePieChartInner.tsx` · `InvoicesPage.tsx` · `ExpensesPage.tsx` · `BylawsPage.tsx`

