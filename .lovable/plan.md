

# فحص شامل للكود — تقرير التدقيق المعماري (محدّث)

---

## 1. ملخص الحالة الحالية

```text
src/
├── pages/           44 ملف (20 ناظر + 15 مستفيد + 9 عامة)
├── components/      ~18 مجلد + 65 ملف جذري
├── hooks/           ~80 ملف (مسطحة بدون تصنيف)
├── utils/           ~30 ملف + pdf/ (~17 ملف)
├── contexts/        2 (Auth + FiscalYear)
├── constants/       3 ملفات
├── lib/             7 ملفات
└── integrations/    supabase client + types
```

---

## 2. ما تم إصلاحه منذ آخر تدقيق ✅

| الإصلاح | الحالة |
|---------|--------|
| مركزة `isSpecificYear` في `FiscalYearContext` | ✅ مطبّق — سطر 67 |
| توحيد Realtime في `useDashboardRealtime` | ✅ AdminDashboard + WaqifDashboard يستخدمانه |
| `BeneficiaryDashboard` يستخدم `useBfcacheSafeChannel` مباشرة | ✅ (مبرر: فلتر `beneficiary_id` خاص) |
| جميع `supabase.channel()` تمر عبر `useBfcacheSafeChannel` | ✅ لا استخدام مباشر |
| الإيرادات التعاقدية = `allocated_amount ?? 0` | ✅ AdminDashboard + ContractsPage + WaqifDashboard |
| فلترة موحدة بـ `isSpecificYear` | ✅ جميع الصفحات الرئيسية |

---

## 3. مشاكل متبقية

### 3.1 `MonthlyAccrualTable` — `isSpecificYear` محلي بدلاً من Context

**سطر 119:**
```typescript
const isSpecificYear = fiscalYearId && fiscalYearId !== 'all';
```

لا يفحص `__none__`. الحساب المركزي (سطر 67 من Context) يفحص:
```typescript
fiscalYearId !== 'all' && fiscalYearId !== '__none__' && !!fiscalYearId
```

**الخطورة:** منخفضة — `__none__` يحدث فقط أثناء التحميل.
**التوصية:** استخدام `isSpecificYear` من props أو إضافة فحص `__none__`.

### 3.2 صفحات عملاقة — لا تزال كما هي

| الصفحة | الأسطر | الحالة |
|--------|--------|--------|
| `UserManagementPage.tsx` | **880** | ❌ لم يُفكك |
| `SettingsPage.tsx` | **721** | ⚠️ tabs محملة كسول لكن الملف الأم ضخم |
| `MySharePage.tsx` | **714** | ❌ لم يُفكك |
| `ReportsPage.tsx` | **693** | ❌ لم يُفكك |
| `ContractsPage.tsx` | **650** | ❌ لم يُفكك |
| `InvoicesPage.tsx` | **536** | ❌ |
| `DisclosurePage.tsx` | **540** | ❌ |

### 3.3 `propertyPerformance` — منطق إشغال مكرر

`ReportsPage.tsx` سطور 97-142: حساب إشغال + إيرادات لكل عقار (45 سطر).
نفس المنطق موجود في `usePropertyFinancials` و `dashboardComputations.computeOccupancy`.
**التوصية:** استخدام hook مشترك بدلاً من إعادة الحساب.

### 3.4 hooks — 80 ملف بدون تصنيف

جميع الـ hooks في مجلد مسطح واحد. التوصية السابقة بتصنيفها لم تُنفذ:
```text
hooks/
├── data/       (useProperties, useContracts, useIncome, ...)
├── financial/  (useFinancialSummary, useComputedFinancials, ...)
├── ui/         (use-mobile, use-toast, useIdleTimeout, ...)
└── auth/       (useAuthContext, useWebAuthn, ...)
```

### 3.5 تسمية غير متسقة — ملفان kebab-case

- `use-mobile.tsx` (يجب: `useMobile.tsx`)
- `use-toast.ts` (يجب: `useToast.ts`)

بقية الـ 78 ملف `camelCase`.

### 3.6 `DashboardLayout.tsx` — 404 سطر

يحتوي swipe gestures + permission filtering + idle timeout + menu labels. يمكن استخراج `useSwipeGesture` و `useMenuPermissions`.

---

## 4. تقييم الجودة المعمارية

| الجانب | التقييم | ملاحظة |
|--------|---------|--------|
| **فصل المسؤوليات** | ⭐⭐⭐⭐☆ | طبقة hooks/utils قوية. `ReportsPage` يحتاج تنظيف |
| **توحيد الأنماط** | ⭐⭐⭐⭐☆ | تحسن كبير: `isSpecificYear` مركزي، Realtime موحد |
| **قابلية الصيانة** | ⭐⭐⭐☆☆ | 7 ملفات > 500 سطر تحتاج تفكيك |
| **الأداء** | ⭐⭐⭐⭐☆ | lazy loading + DeferredRender + bfcache ممتاز |
| **الاختبارات** | ⭐⭐⭐⭐☆ | ~40 ملف اختبار — تغطية جيدة |
| **الأمان** | ⭐⭐⭐⭐☆ | RLS + ProtectedRoute + roles |
| **التوثيق** | ⭐⭐⭐⭐☆ | BUSINESS_RULES.md شامل (16 قسم) |

---

## 5. التوصيات مرتبة حسب الأولوية

### أولوية عالية

| # | التوصية | الأثر |
|---|---------|-------|
| 1 | تفكيك `UserManagementPage` (880 سطر) → hook + 3 مكونات | صيانة أسهل |
| 2 | تفكيك `MySharePage` (714 سطر) → hook + مكونات | صيانة أسهل |
| 3 | استخراج `propertyPerformance` من `ReportsPage` لـ hook مشترك | إزالة تكرار |

### أولوية متوسطة

| # | التوصية |
|---|---------|
| 4 | تصنيف hooks في مجلدات فرعية (~80 ملف) |
| 5 | استخراج `LogoManager` من `SettingsPage` |
| 6 | توحيد تسمية الملفات (2 ملف kebab → camelCase) |
| 7 | إصلاح `isSpecificYear` في `MonthlyAccrualTable` ليفحص `__none__` |

### أولوية منخفضة

| # | التوصية |
|---|---------|
| 8 | توحيد PDF core (header/footer/fonts) عبر 17 ملف |
| 9 | استخراج swipe/permissions من `DashboardLayout` |

---

## 6. الخلاصة

المشروع تحسن **بشكل ملموس** منذ التدقيق السابق:
- **`isSpecificYear` مركزي** — أزال التكرار من 7+ صفحات
- **Realtime موحد** — `useDashboardRealtime` يُستخدم في لوحتين رئيسيتين
- **الإيرادات التعاقدية** — تعتمد على `allocated_amount ?? 0` بشكل متسق
- **التوثيق** — `BUSINESS_RULES.md` يغطي 16 قسم

المشكلة الرئيسية المتبقية: **7 صفحات عملاقة (500-880 سطر)** تحتاج تفكيك. هذا هو أكبر عائق للصيانة حالياً. بقية المشاكل تجميلية أو تنظيمية ولا تؤثر على الوظائف.

