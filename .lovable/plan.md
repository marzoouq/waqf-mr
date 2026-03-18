# خطة إصلاح نتائج التقرير الجنائي — الواجهات والهوية البصرية

## ملخص الفحص

بعد فحص الكود، **6 مشاكل حقيقية** تحتاج إصلاح + **4 تحسينات** مشروعة.

## المشاكل والإصلاحات

### 🔴 خطأ 1 — شعار الوقف لا يظهر في Sidebar

**الملف:** `src/components/Sidebar.tsx` سطر 42-43

السطر الحالي يعرض `Building2` دائماً رغم أن `waqfInfo` مُحمّل فعلاً (سطر 33).

**الإصلاح:** إضافة شرط: إذا وُجد `waqfInfo?.waqf_logo_url` يعرض `<img>` وإلا يبقى `Building2`.

---

### 🔴 خطأ 2 — WaqifDashboard يعرض "الواقف" ثابتاً

**الملف:** `src/pages/beneficiary/WaqifDashboard.tsx` سطر 182

النص ثابت `الواقف` بينما `BeneficiaryDashboard` يستخدم `displayName` من بيانات المستخدم.

**الإصلاح:** إضافة `useAuth()` + `useBeneficiariesSafe()` لجلب اسم الواقف الفعلي، مع fallback لـ "الواقف".

---

### 🟡 خطأ 3 — PrintHeader ألوان hardcoded

**الملف:** `src/components/PrintHeader.tsx`

الألوان `hsl(158, 64%, 25%)` ثابتة ولا تتغير مع الثيم.

**الإصلاح:** استبدال الألوان المضمّنة بـ CSS variables: `color: hsl(var(--primary))` و `border-color: hsl(var(--secondary))`.

---

### 🟡 خطأ 4 — تعريفات متناقضة لـ "قريب الانتهاء"


| الموقع                          | المدة         |
| ------------------------------- | ------------- |
| `AdminDashboard.tsx` سطر 143    | 30 يوم        |
| `ContractsPage.tsx` سطر 374     | 90 يوم        |
| `ContractsViewPage.tsx` سطر 36  | 90 يوم        |
| `ContractStatsCards.tsx` سطر 69 | يعرض "3 أشهر" |


**الإصلاح:** توحيد الثابت في `src/constants/index.ts` (`EXPIRING_SOON_DAYS = 90`) واستخدامه في جميع الملفات. تحديث AdminDashboard من 30 إلى 90 يوماً.

---

### 🟡 خطأ 5 — Emoji في KPI label

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 237

**الإصلاح:** إزالة `⚠️` واستخدام `text-destructive font-bold` فقط للنص "عجز مالي".

---

### 🟡 خطأ 6 — Theme لا يُعاد تطبيقه عند تغيير dark/light

**الملف:** `src/components/themeColor.utils.ts`

الكود فعلاً يحتوي `MutationObserver` على `class` attribute (سطر 336-347) — **هذا الخطأ غير صحيح**. `initThemeFromStorage()` يراقب تغيير الـ class ويعيد تطبيق الثيم. لا حاجة لإصلاح.

---

### 🟢 تحسين 1 — ترحيب شخصي للناظر

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 248

حالياً: `مرحباً بك، ناظر الوقف`

**الإصلاح:** إضافة اسم الناظر من `useAuth().user?.email` مختصراً.

---

### 🟢 تحسين 2 — BetaBanner يحفظ الإغلاق مؤقتاً فقط

**الملف:** `src/components/BetaBanner.tsx`

حالياً `useState(false)` — عند إعادة التحميل يعود. يمكن جعله `sessionStorage` ليبقى مغلقاً خلال الجلسة.

---

### 🟢 تحسين 3 — CollectionSummaryChart يدمج جزئي مع متأخر

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 420

**الإصلاح:** فصل الدفع الجزئي كشريحة ثالثة بلون مختلف (warning/أصفر).

---

## ملخص التغييرات


| #   | الملف                                               | التغيير                             | &nbsp; |
| --- | --------------------------------------------------- | ----------------------------------- | ------ |
| 1   | `Sidebar.tsx`                                       | عرض شعار الوقف بدل Building2        | &nbsp; |
| 2   | `WaqifDashboard.tsx`                                | عرض اسم الواقف الفعلي               | &nbsp; |
| 3   | `PrintHeader.tsx`                                   | استبدال ألوان hardcoded بـ CSS vars | &nbsp; |
| 4   | `constants/index.ts`                                | إضافة `EXPIRING_SOON_DAYS = 90`     | &nbsp; |
| 4b  | `AdminDashboard.tsx`                                | استخدام الثابت الموحد (90 يوم)      | &nbsp; |
| 4c  | `ContractsPage.tsx`                                 | استخدام الثابت الموحد               | &nbsp; |
| 4d  | `ContractsViewPage.tsx`                             | استخدام الثابت الموحد               | &nbsp; |
| 5   | `AdminDashboard.tsx`                                | إزالة emoji من KPI                  | &nbsp; |
| 6   | themeColor.utils.ts                                 | لا حاجة — MutationObserver موجود    | &nbsp; |
| 7   | `AdminDashboard.tsx`                                | ترحيب شخصي للناظر                   | &nbsp; |
| 8   | `BetaBanner.tsx`                                    | حفظ إغلاق البانر في sessionStorage  | &nbsp; |
| 9   | `AdminDashboard.tsx` + `CollectionSummaryChart.tsx` | فصل الدفع الجزئي كشريحة ثالثة       | &nbsp; |


**إجمالي الملفات المعدّلة:** 8 ملفات