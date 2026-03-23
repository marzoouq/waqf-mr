# حالة المشروع — نظام إدارة وقف مرزوق بن علي الثبيتي

## الإصلاحات المنجزة

### ✅ تصحيح منطق الإيرادات التعاقدية
- إزالة fallback `?? rent_amount` → `?? 0` في AdminDashboard, ContractsPage, WaqifDashboard
- الإيرادات التعاقدية تعتمد على `allocated_amount` من `contract_fiscal_allocations`

### ✅ توحيد فلترة العقود
- `isSpecificYear` → جميع العقود (active + expired)
- `all` → فقط `active`
- مطبّق في: AdminDashboard, PropertiesPage, ContractsPage, WaqifDashboard

### ✅ جدول الاستحقاقات الشهري
- يعتمد على `payment_invoices` الفعلية بدلاً من `rent/12`
- أشهر ديناميكية حسب حدود السنة المالية
- تلوين حسب حالة الفاتورة (مسدد/معلق/متأخر)

### ✅ استخراج `usePropertyFinancials` hook
- منطق حسابي موحد بين PropertiesPage و PropertiesViewPage

### ✅ إنشاء `dashboardComputations.ts`
- `computeMonthlyData`, `computeCollectionSummary`, `computeOccupancy`
- مستخدم في AdminDashboard و WaqifDashboard

### ✅ إزالة تبويب "مقارنة سنوية" المكرر من التقارير

### ✅ إصلاح PDF الوحدات
- `rent_amount` يُعامل كسنوي (الشهري = rent/12)

### ✅ توثيق BUSINESS_RULES.md
- 16 قسم يغطي جميع القواعد المالية والتقنية

### ✅ مركزة `isSpecificYear` في FiscalYearContext
- إزالة الحساب المكرر من 7+ صفحات
- القيمة متاحة مباشرة من `useFiscalYear()`

### ✅ إنشاء `useDashboardRealtime` hook موحد
- يستخدم `useBfcacheSafeChannel` للتوافق مع bfcache
- يستبدل الأنماط المكررة في AdminDashboard و WaqifDashboard

### ✅ إصلاح `isSpecificYear` في MonthlyAccrualTable
- إضافة فحص `__none__` للتوافق مع الحساب المركزي

---

## التفكيكات المنجزة

| # | الملف | قبل | بعد | التفاصيل |
|---|-------|-----|-----|----------|
| 1 | `UserManagementPage` | 880 سطر | 165 سطر | hook + 3 مكونات |
| 2 | `MySharePage` | 714 سطر | 194 سطر | hook + مكونات فرعية |
| 3 | `SettingsPage` | 561 سطر | ~120 سطر | 6 مكونات inline → ملفات مستقلة |
| 4 | `ContractsPage` | 650 سطر | ~200 سطر | `useContractsPage` hook |

---

## التحسينات المعمارية المنجزة

| # | التوصية | الحالة |
|---|---------|--------|
| ~~1~~ | ~~تفكيك `UserManagementPage`~~ | ✅ تم — 880→165 سطر |
| ~~2~~ | ~~تفكيك `MySharePage`~~ | ✅ تم — 714→194 سطر |
| ~~3~~ | ~~استخراج `propertyPerformance` من `ReportsPage`~~ | ✅ تم — hook مشترك `usePropertyPerformance` |
| ~~4~~ | ~~تصنيف hooks في مجلدات فرعية~~ | ✅ تم — data/financial/ui/auth/page |
| ~~5~~ | ~~استخراج `LogoManager` من `SettingsPage`~~ | ✅ تم — مكون مستقل |
| ~~6~~ | ~~توحيد PDF core (header/footer/fonts)~~ | ✅ تم — `core.ts` موحد |
| ~~7~~ | ~~استخراج 6 inline tabs من `SettingsPage`~~ | ✅ تم — 561→~120 سطر |
| ~~8~~ | ~~استخراج `useContractsPage` hook~~ | ✅ تم — 650→~200 سطر |
| ~~9~~ | ~~تقسيم `paymentInvoice.ts` (897 سطر)~~ | ✅ تم — shared + 3 قوالب |
| ~~10~~ | ~~نقل ملفات الاختبار للمجلدات الفرعية~~ | ✅ تم — 36 ملف |
| ~~11~~ | ~~إزالة proxy files وتحديث الاستيرادات~~ | ✅ تم — 55 proxy حُذف، 246 import حُدّث |

---

## التحسينات المعلقة (أولوية منخفضة)

| # | التوصية | ملاحظة |
|---|---------|--------|
| 1 | توحيد نمط `WaqifDashboard` مع `BeneficiaryDashboard` | تجميلي |

---

## القواعد السارية

مرجع كامل في `BUSINESS_RULES.md` — الأقسام 9-16 هي الأهم:
- §9: الإيرادات = الدخل الفعلي المحصّل فقط
- §10: السنة المالية هي المرجع وليس الميلادية
- §11: أمثلة حالات حافة (5 سيناريوهات)
- §12: فلترة موحدة بـ `isSpecificYear`
- §16: قواعد البطاقات لمنع التكرار
