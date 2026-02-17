
# تقرير الفحص الجنائي العميق - الجزء الثالث
# الملفات التي لم تُفحص سابقاً

---

## الملخص التنفيذي

تم فحص **34 ملف إضافي** يشمل: مكونات accounts (8 مكونات)، صفحات لوحة التحكم المتبقية (AdminDashboard، ReportsPage، AuditLogPage، SettingsPage، UserManagementPage)، صفحات المستفيد المتبقية (BeneficiaryDashboard، AccountsViewPage، FinancialReportsPage، InvoicesViewPage)، والمكونات المساعدة (AiAssistant، NotificationBell، ExportMenu، WaqfInfoBar، FiscalYearSelector، IdleTimeoutWarning، TablePagination، SkeletonLoaders، PrintHeader)، والهوكات (useWaqfInfo، useAppSettings، usePdfWaqfInfo، useFiscalYears)، وملفات البنية التحتية (types/database.ts، utils/notifications.ts).

---

## 1. المشاكل المكتشفة

### 1.1 خطورة متوسطة

**A. حساب `distributableAmount` مكرر في 4 مواضع إضافية**

تم الكشف عن نمط الحساب المحلي مجدداً في ملفات لم تُصلح سابقاً:

| الملف | السطر | الحساب | الملاحظة |
|-------|-------|--------|----------|
| `BeneficiaryDashboard.tsx` | 29-30 | `waqfRevenue - waqfCorpusManual` | لم يتم تصحيحه في الجولة السابقة |
| `FinancialReportsPage.tsx` | 61-62 | `waqfRevenue - waqfCorpusManual` | نفس الحساب المحلي |
| `AccountsViewPage.tsx` | 56 | `waqfRevenue - waqfCorpusManual` | نفس الحساب المحلي |
| `AccountsViewPage.tsx` | 55 | `totalIncome + waqfCorpusPrevious` | تكرار حساب `grandTotal` |

بينما `useFinancialSummary` يُرجع `availableAmount` بالفعل (وهو `waqfRevenue - waqfCorpusManual`)، و`grandTotal` أيضاً موجود في الهوك. التناقض أن MySharePage وDisclosurePage صُلّحا في الجولة السابقة لكن هذه الملفات الثلاثة لم تُصلح.

**التوصية**: توحيد الحسابات في هذه الملفات الثلاثة باستخدام `availableAmount` و`grandTotal` من `useFinancialSummary`.

---

**B. `UserManagementPage.tsx` - استعلام `registration_enabled` يستخدم `.single()`**

السطر 51-60:
```typescript
const { data } = await supabase
  .from('app_settings')
  .select('value')
  .eq('key', 'registration_enabled')
  .single(); // ← يجب أن يكون .maybeSingle()
```

إذا لم تكن القيمة موجودة في جدول `app_settings` (مثلاً في بيئة جديدة)، يُلقي `.single()` خطأ 406 صامتاً. يجب استخدام `.maybeSingle()` مع قيمة افتراضية.

---

**C. `AuditLogPage.tsx` - قائمة فلترة الجداول ناقصة**

السطر 169-179: قائمة الـ Select تشمل فقط:
```
income, expenses, accounts, distributions, invoices
```
لكنها لا تشمل:
- `properties` - لها مشغل تدقيق
- `contracts` - لها مشغل تدقيق
- `beneficiaries` - لها مشغل تدقيق
- `units` - لها مشغل تدقيق
- `fiscal_years` - لها مشغل تدقيق

المستخدم لا يستطيع تصفية سجل التدقيق حسب هذه الجداول الخمسة رغم وجودها في قاعدة البيانات.

**التوصية**: إضافة هذه الجداول الخمسة لقائمة الفلترة في `AuditLogPage.tsx`.

---

### 1.2 خطورة منخفضة

**D. `WaqfInfoBar.tsx` - حفظ الشعار بدون تنظيف URL المؤقت**

السطر 66: `setLogoPreview(URL.createObjectURL(file))` ينشئ URL مؤقت في الذاكرة.
عند إغلاق الـ Dialog أو الإلغاء، لا يتم تنفيذ `URL.revokeObjectURL(logoPreview)`.

التأثير طفيف جداً (استهلاك ذاكرة بسيط) لكنه مخالف للممارسات الجيدة.

**التوصية**: استدعاء `URL.revokeObjectURL` في cleanup أو عند إعادة تعيين `logoPreview`.

---

**E. `useFiscalYears.ts` - `useActiveFiscalYear` تُرجع `fiscalYears[0]` كبديل**

السطر 29:
```typescript
const active = fiscalYears.find((fy) => fy.status === 'active') || fiscalYears[0] || null;
```
إذا لم تكن هناك سنة مالية "active"، تُرجع الدالة أول سنة مالية بدون اعتبار لحالتها. قد تكون مغلقة.

هذا سلوك متعمد (fallback) لكنه قد يسبب إظهار بيانات سنة مغلقة كأنها السنة الحالية في لوحات التحكم.

**التوصية**: إضافة تحذير أو تمييز بصري في حالة لم تكن هناك سنة مالية نشطة.

---

**F. `AiAssistant.tsx` - سجل المحادثة يُحمَّل بالكامل في الذاكرة بدون حد**

السطر 19: `const [messages, setMessages] = useState<Msg[]>([])` بدون حد أقصى.

رغم أن الوظيفة الخلفية تحدد 20 رسالة، الواجهة لا تُزيل الرسائل القديمة من الحالة، مما يعني أنه في جلسة طويلة يمكن تجمع رسائل كثيرة في الذاكرة. هذا وضع نظري إذ الـ backend يوقف عند 20 رسالة.

---

**G. `SettingsPage.tsx` - `useEffect` في `AppearanceTab` يعتمد على `isLoading` لا على `appearance`**

السطر 178:
```typescript
useEffect(() => { setForm(appearance); }, [isLoading]);
```
يجب أن يكون `[appearance]` بدلاً من `[isLoading]`. إذا تغيرت البيانات بعد التحميل (مثلاً بعد حفظ من مكان آخر)، لن يتم تحديث الـ form.

---

**H. `AccountsBeneficiariesTable.tsx` - قسمة على صفر محتملة**

السطر 47:
```typescript
(manualDistributions * Number(b.share_percentage) / totalBeneficiaryPercentage)
```

إذا كان `totalBeneficiaryPercentage === 0` (لا يوجد مستفيدون)، ستظهر قيمة `NaN` أو `Infinity`. الدالة الوالدة تمنع ظهور الجدول إذا `beneficiaries.length === 0` لكن `totalBeneficiaryPercentage` قد يكون 0 مع وجود مستفيدين بنسبة 0%.

---

## 2. ملاحظات إيجابية - ما تم التحقق منه وهو سليم

| الملف | النتيجة |
|-------|---------|
| `AiAssistant.tsx` | تحقق JWT صحيح + معالجة streaming سليمة + حماية `!user` |
| `NotificationBell.tsx` | `markAsRead` + `markAllAsRead` + عرض نسبي للوقت |
| `ExportMenu.tsx` | منطق بسيط ومتسق + دعم print/PDF |
| `WaqfInfoBar.tsx` | تحقق من نوع الملف + حد 2MB للشعار + 500 حرف للحقول |
| `FiscalYearSelector.tsx` | بسيط ومتسق، يستخدم `useFiscalYears` بشكل صحيح |
| `IdleTimeoutWarning.tsx` | مكون نقي، AlertDialog مدار من الخارج |
| `TablePagination.tsx` | منطق ترقيم ذكي مع ellipsis، `totalPages <= 1` يُخفي المكون |
| `SkeletonLoaders.tsx` | هياكل skeleton جاهزة لجميع الصفحات (DashboardSkeleton شاملة) |
| `PrintHeader.tsx` | يجمع بيانات الوقف + الشعار + التاريخ الهجري والميلادي |
| `useWaqfInfo.ts` | staleTime=10 دقائق مناسب، تُرجع كائن موحد |
| `useAppSettings.ts` | يدعم JSON settings + invalidation مزدوج |
| `usePdfWaqfInfo.ts` | وسيط بسيط ومتسق |
| `useFiscalYears.ts` | ترتيب تنازلي بالتاريخ صحيح |
| `types/database.ts` | أنواع شاملة ومتوافقة مع schema قاعدة البيانات |
| `utils/notifications.ts` | fire-and-forget بنمط موحد، 3 وظائف واضحة |
| `AccountsDistributionTable.tsx` | التسلسل المالي الكامل (17 صف) دقيق |
| `AccountsBeneficiariesTable.tsx` | يعرض 6 خانات عشرية للنسبة (دقة حسابية) |
| `AccountsCollectionTable.tsx` | تعديل inline مع حساب فوري، حماية من disabled عند pending |
| `AccountsContractsTable.tsx` | TableFooter مجمّع + حماية إجراءات المستخدم |
| `AuditLogPage.tsx` | مقارنة old/new data، ترقيم 15 عنصر، بحث ذكي |
| `AdminDashboard.tsx` | KPIs ديناميكية + رسوم بيانية حقيقية + lazy loading |
| `BeneficiaryDashboard.tsx` | عرض حصة فورية + وصول سريع + آخر 3 إشعارات |
| `ReportsPage.tsx` | إفصاح كامل + 4 تبويبات + PDF للإفصاح والتقرير |
| `AccountsViewPage.tsx` | عرض شامل + تصدير PDF + ربط بصفحة الإفصاح |
| `FinancialReportsPage.tsx` | 6 رسوم بيانية + منطق الحصص |
| `InvoicesViewPage.tsx` | عرض جدولي/شبكي + فلترة + PDF |
| `UserManagementPage.tsx` | كامل + ربط مع edge function + تفعيل/إلغاء/حذف |
| `SettingsPage.tsx` | 6 تبويبات إعدادات شاملة |

---

## 3. قائمة التعديلات المقترحة (حسب الأولوية)

| # | الملف | التعديل | الأثر |
|---|-------|---------|-------|
| 1 | `BeneficiaryDashboard.tsx` | استخدام `availableAmount` بدل `waqfRevenue - waqfCorpusManual` | توحيد مالي |
| 2 | `FinancialReportsPage.tsx` | نفس التعديل أعلاه | توحيد مالي |
| 3 | `AccountsViewPage.tsx` | نفس التعديل + استخدام `grandTotal` من الهوك | توحيد مالي |
| 4 | `UserManagementPage.tsx` سطر 57 | تغيير `.single()` إلى `.maybeSingle()` | منع خطأ 406 |
| 5 | `AuditLogPage.tsx` سطور 171-178 | إضافة properties, contracts, beneficiaries, units, fiscal_years في Select | اكتمال فلترة |
| 6 | `SettingsPage.tsx` سطر 178 | تغيير `[isLoading]` إلى `[appearance]` في useEffect | صحة React |
| 7 | `AccountsBeneficiariesTable.tsx` سطر 47 | إضافة حماية `totalBeneficiaryPercentage > 0` | منع NaN |
| 8 | `WaqfInfoBar.tsx` سطر 66 | استدعاء `URL.revokeObjectURL` عند الإلغاء | تنظيف ذاكرة |

---

## 4. الدرجة المحدّثة بعد الفحص الشامل

| المحور | الدرجة السابقة | الدرجة المحدّثة |
|--------|---------------|----------------|
| سلامة قاعدة البيانات | 9.5/10 | 9.5/10 |
| سياسات الأمان (RLS) | 10/10 | 10/10 |
| الوظائف الخلفية | 8.5/10 | 8.5/10 |
| المصادقة والجلسات | 9/10 | 9/10 |
| المنطق المالي | 9/10 | 8.5/10 (حسابات محلية في 3 ملفات إضافية) |
| بنية الكود | 9/10 | 8.5/10 (single بدل maybeSingle + useEffect dependency) |
| حماية البيانات | 9/10 | 9/10 |
| تقارير PDF | 9.5/10 | 9.5/10 |
| واجهة المستخدم | - | 9.5/10 (Skeletons + Pagination + مكونات متسقة) |

**الدرجة الإجمالية المحدّثة: 9.1/10**

---

## 5. ملخص جميع جولات الفحص الثلاث

| الجولة | الملفات المفحوصة | المشاكل المكتشفة | تم التصحيح |
|--------|-----------------|-----------------|------------|
| الجولة الأولى | 17 جدول + Edge Functions + RLS | 4 مشاكل | 3 منها |
| الجولة الثانية | 22 ملف هوك/صفحة/PDF | 9 مشاكل | 7 منها |
| هذه الجولة | 34 ملف مكونات/صفحات | 8 مشاكل | 0 (للتطبيق) |

**إجمالي المشاكل المكتشفة في النظام: 21 مشكلة**
**تم تصحيحها: 10 | متبقية للتطبيق: 8 (جميعها منخفضة إلى متوسطة الخطورة)**
