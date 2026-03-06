

# خطة: إصلاح BUG-02 و BUG-05

## نتائج التحقق

| البند | الحالة |
|-------|--------|
| **BUG-04** `accountantExcludedRoutes` | ✅ **مُصلح بالفعل** — لم يعد موجوداً في الكود |
| **BUG-02** `tooltipStyle` في AdminDashboard | ✅ **مُصلح** — منقول لمستوى الوحدة (سطر 31) |
| **BUG-02** `tooltipStyle` في ReportsPage | ❌ **داخل الـ component** (سطر 67) |
| **BUG-02** `tooltipStyle` في MonthlyPerformanceReport | ❌ **داخل الـ component** (سطر 75) |
| **BUG-02** `tooltipStyle` في YearOverYearComparison | ❌ **داخل الـ component** (سطر 118) |
| **BUG-02** `tooltipStyle` في FinancialReportsPage | ✅ **مُصلح** — مستوى الوحدة (سطر 33) |
| **BUG-05** `signIn` loading | ⚠️ **يعتمد على timeout 5 ثوانٍ كـ fallback** — يمكن تحسينه |
| **UserManagementPage بطاقات جوال** | ✅ **مُنفَّذ بالفعل** في آخر تعديل |
| **ContractsPage بطاقات جوال** | ✅ **مُنفَّذ بالفعل** |

## التغييرات المطلوبة

### 1. نقل `tooltipStyle` خارج الـ component — 2 ملف

| الملف | التغيير |
|-------|---------|
| `src/pages/dashboard/ReportsPage.tsx` | نقل `tooltipStyle` من سطر 67 إلى مستوى الوحدة (قبل الـ component) |
| `src/components/reports/MonthlyPerformanceReport.tsx` | نقل من سطر 75 إلى مستوى الوحدة |
| `src/components/reports/YearOverYearComparison.tsx` | نقل من سطر 118 إلى مستوى الوحدة |

### 2. تحسين `signIn` في AuthContext — ملف واحد

| الملف | التغيير |
|-------|---------|
| `src/contexts/AuthContext.tsx` | تقليل timeout من 5 ثوانٍ إلى 3 ثوانٍ (يتوافق مع fetchRole timeout الموجود بالفعل عند 3 ثوانٍ) |

## 5 ملفات متأثرة، تغييرات بسيطة (نقل سطر واحد في كل ملف)

