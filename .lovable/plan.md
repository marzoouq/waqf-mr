

# فحص شامل للكود — تقرير التدقيق المعماري

---

## 1. الهيكل العام — نظرة عامة

```text
src/
├── pages/           44 ملف (20 ناظر + 15 مستفيد + 9 عامة)
├── components/      ~18 مجلد فرعي + 20+ ملف جذري
├── hooks/           ~80 ملف (بما فيها الاختبارات)
├── utils/           ~30 ملف + مجلد pdf (~30 ملف)
├── contexts/        2 سياق (Auth + FiscalYear)
├── constants/       3 ملفات
├── lib/             7 ملفات
├── types/           1 ملف (database.ts)
└── integrations/    supabase client + types
```

**الحجم:** ~44 صفحة، ~80 hook، ~60 مكون مخصص، ~30 ملف PDF. **مشروع ضخم.**

---

## 2. النقاط الإيجابية (ما يعمل بشكل جيد)

| الجانب | التقييم |
|--------|---------|
| **Lazy loading** | جميع الصفحات محملة كسول عبر `lazyWithRetry` — ممتاز |
| **CRUD Factory** | `useCrudFactory` يوحد عمليات CRUD لجميع الجداول — نمط ناضج |
| **الحسابات الموحدة** | `dashboardComputations.ts` + `useFinancialSummary` + `useComputedFinancials` — فصل جيد |
| **أمان المسارات** | `ProtectedRoute` مع `allowedRoles` على كل مسار |
| **اختبارات** | تغطية اختبارية جيدة (~40+ ملف اختبار) |
| **Realtime** | قنوات Supabase Realtime في لوحات التحكم |
| **PWA** | دعم PWA + offline + SwUpdate |
| **DeferredRender** | تأخير المكونات غير الحرجة عن التحميل الأولي |

---

## 3. مشاكل معمارية حرجة

### 3.1 صفحات عملاقة (God Components)

| الصفحة | الأسطر | المشكلة |
|--------|--------|---------|
| `UserManagementPage.tsx` | **880** | CRUD كامل + UI + validation + API calls كلها في ملف واحد |
| `MySharePage.tsx` | **714** | منطق حسابي + عرض + تصدير + طلبات سُلف |
| `ReportsPage.tsx` | **693** | 7 تبويبات + حسابات + رسوم بيانية |
| `ContractsPage.tsx` | **650** | 4 تبويبات + CRUD + فلترة + تصدير |
| `SettingsPage.tsx` | **721** | 11+ تبويب محملة كسول لكن المنطق المشترك في الملف الأم |
| `InvoicesPage.tsx` | **534** |  |
| `DisclosurePage.tsx` | **540** |  |

**التوصية:** أي ملف > 400 سطر يحتاج تفكيك. استخراج المنطق في hooks والعرض في مكونات فرعية.

### 3.2 تكرار Realtime Subscriptions

```text
AdminDashboard.tsx    → supabase.channel('admin-dashboard-realtime')
WaqifDashboard.tsx    → supabase.channel('waqif-dashboard-realtime')
BeneficiaryDashboard  → useBfcacheSafeChannel (مختلف!)
```

3 أنماط مختلفة لنفس الوظيفة. يجب توحيدها في hook واحد مثل `useDashboardRealtime(tables[])`.

### 3.3 `UserManagementPage` — منطق مخلوط بالعرض

880 سطر بدون hooks مستخرجة. `callAdminApi` + mutations + state + UI كلها في ملف واحد. يجب استخراج:
- `useUserManagement` hook للـ CRUD
- مكونات `UserTable`, `UserFormDialog`, `UserDeleteDialog`

### 3.4 مسار `/beneficiary-messages` لم يكن مسجلاً (أُصلح)

المسار موجود الآن في `App.tsx` سطر 166 (`/beneficiary/messages`). تم التأكد.

---

## 4. فصل المسؤوليات (Separation of Concerns)

### 4.1 ✅ جيد: طبقة البيانات

```text
hooks/ (data fetching) → utils/ (calculations) → components/ (display)
```

`useFinancialSummary` = `useRawFinancialData` + `useComputedFinancials` — فصل نظيف.

### 4.2 ⚠️ ضعيف: صفحات تمزج الحساب والعرض

`ReportsPage.tsx` سطور 97-140: حسابات `propertyPerformance` (إشغال + إيرادات لكل عقار) مباشرة في الصفحة. هذا نفس المنطق في `PropertiesPage.tsx`. يجب أن يكون في `usePropertyFinancials` (موجود لكن غير مستخدم بالكامل).

### 4.3 ⚠️ PDF كطبقة منفصلة — لكن ضخمة

`src/utils/pdf/` يحتوي **17 ملف** + `index.ts` يعيد تصدير **23 دالة**. لا مشكلة في الفصل، لكن:
- لا يوجد ملف `core.ts` مشترك واضح للتخطيط (header/footer/fonts)
- كل ملف يعيد تعريف الهوامش والخطوط

---

## 5. التعقيد الزائد

### 5.1 `DashboardLayout.tsx` — 404 سطر

يحتوي:
- Sidebar swipe gestures (60 سطر)
- Permission filtering (50 سطر)
- Idle timeout (30 سطر)
- Edge swipe to open (40 سطر)
- Menu label customization (30 سطر)

التوصية: استخراج `useSwipeGesture` hook + `useMenuPermissions` hook.

### 5.2 `SettingsPage.tsx` — 721 سطر رغم Lazy tabs

رغم أن التبويبات محملة كسول، الملف الأم يحتوي:
- `LogoManager` (100 سطر) — يجب أن يكون مكون مستقل
- منطق الإعدادات العامة + الإشعارات + الأمان كلها مخلوطة

### 5.3 عدد hooks مفرط

80 hook في مجلد واحد بدون تصنيف فرعي. التوصية:
```text
hooks/
├── data/     (useProperties, useContracts, useIncome, ...)
├── financial/ (useFinancialSummary, useComputedFinancials, ...)
├── ui/       (use-mobile, use-toast, useIdleTimeout, ...)
└── auth/     (useAuthContext, useWebAuthn, ...)
```

---

## 6. أنماط غير متسقة

### 6.1 تسمية الملفات

| النمط | أمثلة |
|-------|-------|
| `use-mobile.tsx` | kebab-case |
| `useAccounts.ts` | camelCase |
| `use-toast.ts` | kebab-case |

معظم الملفات `camelCase` لكن ملفين `kebab-case`. يجب التوحيد.

### 6.2 `BeneficiaryDashboard` vs `WaqifDashboard`

| الجانب | BeneficiaryDashboard | WaqifDashboard |
|--------|---------------------|----------------|
| جلب البيانات | RPC موحد `useBeneficiaryDashboardData` | hooks منفصلة |
| Realtime | `useBfcacheSafeChannel` | `supabase.channel` يدوي |
| Retry | `handleRetry` callback | لا يوجد |

نمطان مختلفان تماماً لنفس نوع الصفحة.

### 6.3 `isSpecificYear` مكرر

```text
AdminDashboard.tsx:   const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
ContractsPage.tsx:    const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
ReportsPage.tsx:      const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
PropertiesPage.tsx:   (نفس المنطق)
```

يجب أن يكون في `FiscalYearContext` كـ computed value جاهز.

---

## 7. مشاكل الأداء المحتملة

### 7.1 `AdminDashboard` — 15+ useMemo

الصفحة تحتوي 15+ `useMemo` مما يشير لتعقيد مفرط. يجب استخراج المنطق الحسابي في hook مخصص `useAdminDashboardStats`.

### 7.2 Realtime بدون تنظيف ذكي

```typescript
// AdminDashboard — يشترك في 4 جداول
tables.forEach((table) => {
  channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
    queryClient.invalidateQueries({ queryKey: [table] });
  });
});
```

أي تغيير في أي صف في أي من الـ 4 جداول يُبطل cache الكامل. لا يوجد filtering بـ `filter` لتقليل التحديثات.

---

## 8. التوصيات مرتبة حسب الأولوية

### أولوية عالية (تؤثر على الصيانة والجودة)

| # | التوصية | الملفات المتأثرة |
|---|---------|-----------------|
| 1 | استخراج `isSpecificYear` في `FiscalYearContext` | جميع الصفحات (~8) |
| 2 | تفكيك `UserManagementPage` (880 سطر) | 1 صفحة → 1 hook + 3 مكونات |
| 3 | توحيد Realtime في `useDashboardRealtime` hook | 3 لوحات تحكم |
| 4 | استخراج `LogoManager` من `SettingsPage` | 1 ملف |

### أولوية متوسطة (تحسين البنية)

| # | التوصية | الملفات |
|---|---------|---------|
| 5 | تصنيف hooks في مجلدات فرعية | ~80 ملف (إعادة تنظيم) |
| 6 | توحيد نمط `WaqifDashboard` مع `BeneficiaryDashboard` | 1 لوحة |
| 7 | استخراج `propertyPerformance` من `ReportsPage` | 1 صفحة |
| 8 | توحيد تسمية الملفات (kebab → camelCase) | 2 ملف |

### أولوية منخفضة (تحسينات مستقبلية)

| # | التوصية | ملاحظة |
|---|---------|--------|
| 9 | توحيد PDF core (header/footer/fonts) | يقلل التكرار عبر 17 ملف |
| 10 | تحسين Realtime filtering | أداء أفضل مع بيانات كبيرة |

---

## ملخص التقييم

| الجانب | التقييم |
|--------|---------|
| **البنية العامة** | ⭐⭐⭐☆☆ — جيدة لكن تحتاج تنظيم أكثر |
| **فصل المسؤوليات** | ⭐⭐⭐⭐☆ — طبقة hooks/utils قوية، بعض الصفحات مخلوطة |
| **قابلية الصيانة** | ⭐⭐⭐☆☆ — الصفحات العملاقة تعيق الصيانة |
| **الأداء** | ⭐⭐⭐⭐☆ — lazy loading ممتاز، realtime يحتاج تحسين |
| **التناسق** | ⭐⭐⭐☆☆ — أنماط مختلفة بين لوحات التحكم الثلاث |
| **الاختبارات** | ⭐⭐⭐⭐☆ — تغطية جيدة، خصوصاً hooks و utils |
| **الأمان** | ⭐⭐⭐⭐☆ — RLS + ProtectedRoute + roles جيدة |

**الخلاصة:** المشروع ناضج ومعقد بـ 44 صفحة و80 hook. البنية الأساسية سليمة (CRUD factory, financial hooks, lazy loading). المشاكل الرئيسية: **صفحات عملاقة** (5 ملفات > 600 سطر)، **أنماط غير متسقة** بين اللوحات الثلاث، و**hooks غير مصنفة**. أولوية الإصلاح: تفكيك الصفحات الكبيرة ثم توحيد الأنماط.

