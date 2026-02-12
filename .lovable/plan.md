

# تقرير المشاكل والأخطاء والملاحظات

---

## 1. مشاكل منطقية (Logic Bugs)

### 1.1 تناقض حساب "حصتي" بين الصفحات
- **DisclosurePage** و **MySharePage**: تحسب الحصة من `distributableAmount = waqfRevenue - waqfCorpusManual` ثم `myShare = distributableAmount * share_percentage / 100`
- **FinancialReportsPage**: تحسب الحصة بشكل مختلف تماماً: `myShare = distributionsAmount * share_percentage / totalBeneficiaryPercentage`
- **النتيجة**: المستفيد يرى رقماً مختلفاً في صفحة "التقارير المالية" عن صفحة "حصتي من الريع" وصفحة "الإفصاح السنوي"!

### 1.2 صفحات المستفيد لا تُفلتر بالسنة المالية
- صفحات DisclosurePage و AccountsViewPage و FinancialReportsPage تستخدم `useIncome()` و `useExpenses()` بدون فلتر سنة مالية، بينما تعرض `accounts[0]` (أحدث حساب)
- **النتيجة**: الإيرادات والمصروفات المعروضة قد تشمل سنوات متعددة بينما الأرقام الختامية لسنة واحدة فقط -- تناقض بصري

### 1.3 سجل الحساب الجديد بدون fiscal_year_id
- في `handleCloseYear` (سطر 339): عند إنشاء سجل الحساب للسنة الجديدة، لا يتم ربطه بـ `fiscal_year_id` الخاص بالسنة الجديدة
- **النتيجة**: السجل "يطفو" بدون ربط بسنة مالية محددة

### 1.4 جدول accounts لا يحتوي عمود fiscal_year_id
- جدول `accounts` يستخدم `fiscal_year` (نص) فقط وليس `fiscal_year_id` (UUID مرتبط بجدول fiscal_years)
- **النتيجة**: لا يمكن فلترة الحسابات الختامية حسب السنة المالية بدقة

---

## 2. مشاكل في تجربة المستخدم (UX Issues)

### 2.1 صفحات المستفيد بدون Skeleton Loaders
- DisclosurePage و FinancialReportsPage و AccountsViewPage لا تحتوي على حالات تحميل (Skeleton)
- **النتيجة**: تظهر أصفار مضللة أثناء التحميل (نفس المشكلة التي أُصلحت في MySharePage)

### 2.2 التنقل بـ `window.location.href` بدل React Router
- في MySharePage (سطر 232) و AccountsViewPage (سطر 306): استخدام `window.location.href` بدلاً من `useNavigate()`
- **النتيجة**: إعادة تحميل كاملة للصفحة بدلاً من تنقل سلس

### 2.3 ProtectedRoute لا يعالج حالة عدم وجود دور
- في سطر 26: الشرط `if (allowedRoles && role && !allowedRoles.includes(role))` يسمح بالدخول إذا كان `role = null` (مستخدم بدون دور)
- **النتيجة**: مستخدم مسجل بدون دور يمكنه الوصول لأي صفحة محمية

---

## 3. مشاكل أمنية (Security Issues)

### 3.1 حماية كلمات المرور المسربة معطلة
- Leaked Password Protection غير مفعلة في إعدادات المصادقة
- **التأثير**: يمكن للمستخدمين استخدام كلمات مرور معروفة ومسربة

### 3.2 بيانات حساسة في سجل المراجعة
- جدول audit_log يخزن old_data و new_data كـ JSONB -- قد يشمل بيانات شخصية (أرقام هوية، أرقام هواتف، حسابات بنكية) من جدول beneficiaries

### 3.3 Edge Functions بدون JWT
- جميع Edge Functions (admin-manage-users, lookup-national-id, ai-assistant, auto-expire-contracts) تعمل بدون التحقق من JWT (`verify_jwt = false`)
- **التأثير**: يمكن لأي شخص استدعاء هذه الدوال بدون مصادقة

---

## 4. مشاكل تقنية (Technical Issues)

### 4.1 تكرار استعلام الإعدادات
- AccountsPage يستعلم `app_settings` مرتين: مرة عبر `useAppSettings()` (سطر 49) ومرة مباشرة عبر `supabase.from('app_settings')` في useEffect (سطر 83)
- **النتيجة**: استعلامات مكررة وإمكانية عدم تزامن

### 4.2 Debounce بمؤقت واحد لجميع الإعدادات
- `saveSetting` في AccountsPage يستخدم `saveSettingTimeout` واحداً لكل الإعدادات
- **النتيجة**: تغيير نسبة الناظر ثم نسبة الواقف بسرعة يلغي حفظ الأول

### 4.3 accounts مرتبة بـ fiscal_year (نص)
- في useAccounts: `orderBy: 'fiscal_year'` -- الترتيب النصي قد لا يعطي نتيجة صحيحة
- **النتيجة**: `accounts[0]` قد لا يكون أحدث حساب فعلاً

---

## 5. خطة الإصلاح المقترحة (حسب الأولوية)

### أولوية عالية:
1. **توحيد حساب حصة المستفيد** عبر جميع الصفحات باستخدام نفس المعادلة
2. **إصلاح ProtectedRoute** لمنع الدخول بدون دور
3. **إضافة Skeleton Loaders** لصفحات المستفيد المتبقية
4. **إصلاح Debounce** لاستخدام مؤقت منفصل لكل إعداد

### أولوية متوسطة:
5. **إزالة استعلام app_settings المكرر** في AccountsPage
6. **استخدام React Router** بدل `window.location.href`
7. **ترتيب accounts بـ created_at** بدلاً من fiscal_year

### أولوية منخفضة:
8. **تفعيل حماية كلمات المرور المسربة**
9. **إضافة فلتر سنة مالية** لصفحات المستفيد

---

## التفاصيل التقنية

### الملفات التي تحتاج تعديل:

```text
1. src/pages/beneficiary/FinancialReportsPage.tsx -- توحيد حساب الحصة
2. src/pages/beneficiary/DisclosurePage.tsx -- إضافة Skeleton + فلتر سنة
3. src/pages/beneficiary/AccountsViewPage.tsx -- إضافة Skeleton + فلتر سنة
4. src/components/ProtectedRoute.tsx -- إصلاح حالة role = null
5. src/pages/dashboard/AccountsPage.tsx -- إصلاح Debounce + إزالة استعلام مكرر
6. src/hooks/useAccounts.ts -- تغيير orderBy إلى created_at
7. src/pages/beneficiary/MySharePage.tsx -- استبدال window.location.href
```
