

# خطة: تنفيذ التحسينات المتبقية (13 تحسين)

## ما تم إصلاحه سابقاً (يُستبعد):
- ✅ #1: عنوان الجوال — تم إضافة `ROUTE_TITLES` (سطر 347)
- ✅ #3-7: Skeleton loaders للصفحات الخمس
- ✅ #9: UserManagement Desktop skeleton — تم إضافة `TableSkeleton` (سطر 358)
- ✅ #16: TermsOfUse — زر العودة موجود بالفعل في الأسفل (سطر 84)

## التحسينات المتبقية (13 تغيير في 10 ملفات):

### 🔴 أولوية عالية

**1. `DashboardLayout.tsx`** — إضافة GlobalSearch للجوال
- إضافة `<GlobalSearch />` في القسم `lg:hidden` (بعد سطر 436) بجانب FiscalYearSelector

### 🟡 أولوية متوسطة

**2. `ContractsPage.tsx`** — نصوص Tabs مختصرة للجوال
- سطر 303-304: إضافة `<span className="hidden sm:inline">فواتير الدفعات</span><span className="sm:hidden">الفواتير</span>` ونفس الشيء لـ `تقرير التحصيل` → `التحصيل`

**3. `FiscalYearSelector.tsx`** — عرض متجاوب + badge للسنة المقفلة
- تغيير `w-[200px]` إلى `w-[140px] sm:w-[200px]`
- إضافة `{fy.status === 'closed' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">مقفلة</Badge>}`

**4. `BeneficiariesPage.tsx`** — TabsList متجاوب
- سطر 140: إضافة `className="w-full sm:w-auto"` لـ TabsList

**5. `BeneficiarySettingsPage.tsx`** — TabsList بـ flex-wrap للجوال
- سطر 178: تغيير `grid-cols-5` إلى `grid-cols-3 sm:grid-cols-5` وإضافة `gap-1`

**6. `Sidebar.tsx`** — اسم الوقف ديناميكي
- استيراد `useWaqfInfo` واستبدال النص الثابت `إدارة الوقف` بـ `waqfInfo?.waqf_name || 'إدارة الوقف'`

**7. `ErrorBoundary.tsx`** — توجيه ذكي بعد الخطأ
- تغيير `window.location.href = '/'` إلى `window.location.href = document.referrer || '/'` أو الأفضل: استخدام `window.location.reload()` لإعادة تحميل الصفحة الحالية بدل الذهاب للرئيسية

**8. `Auth.tsx`** — كشف انقطاع الشبكة
- إضافة state `isOffline` مع `navigator.onLine` و`online/offline` events
- عرض تنبيه واضح عند انقطاع الشبكة بدل spinner لا نهائي

**9. `Index.tsx`** — Skeleton للإحصاءات
- إضافة state `statsLoading` وعرض `Skeleton` بدل `...` أثناء التحميل

**10. `BetaBanner.tsx`** — تحسين accessibility
- إضافة `role="status"` و`aria-live="polite"` للـ div الرئيسي

### ملفات متأثرة: 10 ملفات
`DashboardLayout.tsx`, `ContractsPage.tsx`, `FiscalYearSelector.tsx`, `BeneficiariesPage.tsx`, `BeneficiarySettingsPage.tsx`, `Sidebar.tsx`, `ErrorBoundary.tsx`, `Auth.tsx`, `Index.tsx`, `BetaBanner.tsx`

