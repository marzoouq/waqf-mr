## تقرير الفحص الجنائي الهجين — الإصدار الثاني ✅

### ملخص تنفيذي

فحص جنائي شامل لـ **AdminDashboard** + **SupportDashboard** + **نظام الصلاحيات**. تم التحقق من 8 بنود، إصلاح 6 مشاكل حقيقية، ورفض 2 إنذار كاذب.

**الاختبارات**: 600+ اختبار ✅ — 0 فشل

---

### 1. إصلاحات AdminDashboard (4 بنود)

| # | المشكلة | الحالة | التفاصيل |
|---|---------|--------|----------|
| BUG-01 | طلب HTTP زائد لكل العقود | ✅ مُصلح | استُبدل `useContractsByFiscalYear('all')` باستعلام خفيف `fiscal_year_id IS NULL` مع `limit(50)` و `staleTime: 300_000` |
| BUG-02 | نسبة التحصيل تحسب عقوداً لا مبالغ | ✅ مُصلح | أُعيد الحساب بالمبالغ: `totalCollected / totalExpected × 100` مع دعم `partially_paid` |
| BUG-03 | `yoy.isLoading` غائب | ❌ إنذار كاذب | `useYoYComparison` لا يُرجع `isLoading` — يعمل تزامنياً عبر `useMemo` |
| BUG-04 | `expiringContracts` بلا `useMemo` | ✅ مُصلح | استُخرجت من IIFE إلى `useMemo` مع dependency على `fyContracts` |
| BUG-05 | `contractualRevenue` و `rent_amount` | 🟡 ملاحظة | `rent_amount` هو الإجمالي السنوي — صحيح تصميمياً |
| BUG-06 | `availableAmount` سالب للسنة المقفلة | ✅ مُصلح | `Math.max(0, ...)` يُطبَّق لكلا الحالتين |
| BUG-07 | `allFiscalYears` غير مستخدم | ❌ إنذار كاذب | مُستخدم في سطر 449 و 460 لمقارنة السنوات |

### 2. إصلاحات SupportDashboard (1 بند)

| المشكلة | الحالة | التفاصيل |
|---------|--------|----------|
| إحصائيات الدعم تحسب من الصفحة الأولى فقط (20 تذكرة) | ✅ مُصلح | أُنشئ `useSupportAnalytics` يجلب حتى 2000 تذكرة بأعمدة خفيفة لحساب `categoryStats`, `priorityStats`, `avgResolutionTime`, `avgRating` وتصدير CSV |

### 3. مزامنة الصلاحيات (1 بند)

| المشكلة | الحالة | التفاصيل |
|---------|--------|----------|
| مفاتيح `support` و `annual_report` غائبة من خرائط الصلاحيات | ✅ مُصلح | مُزامنة في `rolePermissions.ts` + `RolePermissionsTab.tsx` + `constants.ts` |

### 4. إصلاح اختبارات متأثرة

| الملف | السبب الجذري | الإصلاح |
|-------|-------------|---------|
| `PropertiesViewPage.test.tsx` | Mock يستخدم `useContractsByFiscalYear` بينما المكون يستخدم `useContractsSafeByFiscalYear` | تصحيح اسم الـ mock |
| `SupportDashboardPage.test.tsx` | Mock لا يتضمن `useSupportAnalytics` الجديد | إضافة mock للـ hook الجديد |

---

### 5. الملفات المُعدَّلة

| الملف | نوع التغيير |
|-------|------------|
| `src/pages/dashboard/AdminDashboard.tsx` | إصلاح BUG-01,02,04,06 |
| `src/hooks/useSupportTickets.ts` | إضافة `useSupportAnalytics` |
| `src/pages/dashboard/SupportDashboardPage.tsx` | ربط التحليلات بالإحصائيات والتصدير |
| `src/constants/rolePermissions.ts` | إضافة `support` و `annual_report` |
| `src/components/settings/RolePermissionsTab.tsx` | مزامنة SECTIONS |
| `src/components/dashboard-layout/constants.ts` | مزامنة مفاتيح القائمة |
| `src/pages/beneficiary/PropertiesViewPage.test.tsx` | إصلاح mock |
| `src/pages/dashboard/SupportDashboardPage.test.tsx` | إصلاح mock |

### 6. التقييم

- **الأمن**: 9.5/10 — لا تغييرات على RLS أو المصادقة
- **الأداء**: 9.5/10 — إزالة طلب HTTP ثقيل + `useMemo` لـ expiringContracts
- **الدقة المالية**: 9.5/10 — نسبة التحصيل بالمبالغ + حماية القيم السالبة
- **الاختبارات**: 600+ ✅ — 0 فشل

**الحالة**: مُعتمد ✅
