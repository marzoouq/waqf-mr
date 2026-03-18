

## الفحص الجنائي المنهجي — التحقق من جميع بنود التقريرين + البنود المؤجلة

### المنهجية: فحص كل بند سطراً بسطر مقابل الكود الفعلي

---

### ⬛ أولاً: جرد جميع البنود المؤجلة من الطبقات السابقة

| المصدر | البند | السبب الأصلي للتأجيل |
|--------|-------|---------------------|
| الطبقة 3 — M-3 | `noPublishedYears` guard مكرر في 14+ صفحة | تغيير هيكلي واسع |
| الطبقة 3 — BUG-PERF2 (الآن) | `computeTotals` يُعاد في 6 صفحات — لا Context مشترك | تحسين هيكلي مؤجل |
| الطبقة 4 — BUG-RD2 | `useBeneficiariesSafe` يُستدعى دائماً حتى لو غير مطلوب | تحسين أداء مؤجل |
| الطبقة 4 — BUG-MS1 | `myShare` بـ 5 تنفيذات مختلفة — يجب استخراج `useMyShare()` | refactoring مؤجل |
| الطبقة 4 — BUG-PERF1 | `vatKeywords` ثابتة تُنشأ داخل `useMemo` | تحسين أداء طفيف |
| لوحة المستفيد — J-09 | تفضيلات الإشعارات في `localStorage` فقط — لا تُحفظ في DB | ميزة جديدة (ليس bug) |

---

### التحقق بند بند — التقرير الأول (الطبقة الرابعة)

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **BUG-SEC1** | GlobalSearch يقرأ `contracts` مباشرة — يتجاوز `contracts_safe` | **❌ ليس ثغرة** — Migration `20260315` قيّد `contracts` SELECT لـ `admin OR accountant` فقط. المستفيد لن يحصل على نتائج من الجدول المباشر — RLS يمنعه. الاستعلام سيعود فارغاً | لا |
| **BUG-SEC2** | GlobalSearch لا يُفلتر بـ `is_fiscal_year_accessible` | **❌ ليس ثغرة** — RESTRICTIVE policy `Restrict unpublished fiscal year data on contracts` تمنع رؤية عقود سنوات غير منشورة حتى لو لم يُصفَّى في الكود. + كما في SEC1، المستفيد محظور أصلاً من `contracts` | لا |
| **BUG-CF1** | `vatAmount` مصدر مزدوج بين `useComputedFinancials` و `useAccountsPage` | **❌ بالتصميم** — `useAccountsPage` هو أداة **تحرير** الناظر (يسمح بتغيير VAT يدوياً قبل الإقفال)، بينما `useComputedFinancials` يقرأ **القيم المحفوظة**. عند الإقفال تتطابق القيم. التعارض المؤقت أثناء التحرير **مقصود** | لا |
| **BUG-CF2** | `myShare=0` بدون تفسير في السنة النشطة | **✅ مؤكد** — MySharePage يعرض "الحصة المستحقة: 0 ر.س" بدون أي رسالة توضيحية. DisclosurePage نفس المشكلة | **نعم** |
| **BUG-AP1** | تعارض `isClosed` بين Dashboard و Accounts | **❌ بالتصميم** — `AccountsPage` يستخدم `isClosed: true` عمداً (التعليق: "Always compute shares in accounts page") ليُظهر **معاينة تقديرية** للناظر. `AdminDashboard` يستخدم `forceClosedMode` عبر `opts`. هذا فرق مقصود في الغرض | لا |
| **BUG-AP2** | `findAccountByFY` يبحث بـ label فقط | **❌ خطأ في التقرير** — الكود الفعلي (سطر 26-34): `accts.find(a => (fy.id && a.fiscal_year_id === fy.id) || a.fiscal_year === fy.label)` — يبحث بـ UUID **أولاً** ثم label. مطابق لمنطق `useComputedFinancials`. ومُختبر بـ 7 اختبارات وحدة | لا |
| **BUG-MS2** | deficit/actualCarryforward تناقض حسابي | **❌ صحيح رياضياً** — `deficit` يمثل العجز الإجمالي (للمستفيد يعرف حجم ديونه). `actualCarryforward` يمثل المبلغ المخصوم فعلياً (للـ PDF يكون دقيقاً). `net` يساوي `max(0, rawNet)` = 0 عند العجز. الأرقام متسقة: PDF يُظهر `net_amount=0, deficit=3000, carryforward_deducted=2000` — صحيح | لا |
| **BUG-FR1** | `netRevenue ≠ beneficiariesShare` تعارض | **❌ بالتصميم** — `netRevenue` = صافي الريع الكلي (قبل توزيع الحصص). `beneficiariesShare` = `availableAmount` = نصيب المستفيدين فقط (بعد خصم حصة الناظر والواقف). مفهومان مختلفان بالتعريف | لا |
| **BUG-FR2** | FinancialReportsPage لا تفحص `isAccountMissing` | **✅ مؤكد** — لا guard لـ `isAccountMissing`. تعرض مخططات بأصفار. لكن الأثر **محدود**: الصفحة تعرض مخططات income/expenses (موجودة حتى بدون حساب ختامي)، و `myShare` سيكون 0 فقط | **نعم** (تحسين UX) |
| **BUG-RD1** | `fiscalYearStatus` لا يُمرر تلقائياً | **❌ ليس مشكلة** — تم التحقق: كل الصفحات تمرر `opts` بشكل صريح: `useFinancialSummary(id, label, { fiscalYearStatus: selectedFY?.status })`. لا توجد صفحة تستدعيه بدون `opts` | لا |
| **BUG-ST1** | `useState` للإعدادات ← FOUC مالي | **❌ بالتصميم** — `useAccountsPage` يستخدم `useState` لأن الناظر **يُحرر** هذه القيم يدوياً (مثلاً يغير نسبة الناظر من 10 إلى 12). `useMemo` لا يدعم التحرير التفاعلي. FOUC مقبول (أجزاء من الثانية) | لا |
| **BUG-ST2** | `saveSetting` بلا debounce عند كل keystroke | **✅ مؤكد** — `handleAdminPercentChange` يستدعي `saveSetting` مباشرة. لكن: (1) الحقل هو input رقمي وليس نص حر، (2) يوجد validation `parseFloat(val)` يرفض القيم غير الصالحة، (3) `upsert` في Supabase idempotent. الأثر ضعيف | **لا** (أداء مقبول) |

---

### التحقق بند بند — التقرير الثاني (الجولة الثانية)

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **J-01** | `fiscalYearId='all'` → fallback يجمع كل السنوات → حصة مضخمة | **❌ ليس مشكلة عملية** — عند `'all'`، `currentAccount = null` → `calculateFinancials()` fallback → لكن `isClosed = false` (لأن `fiscalYearStatus` من `selectedFY?.status` ← عند all لا توجد سنة محددة). والنتيجة: `availableAmount = 0` و `myShare = 0`. المستفيد لا يرى مبلغاً مضخماً — يرى صفراً | لا |
| **J-02** | `availableAmount=0` في السنة النشطة بلا رسالة | **= BUG-CF2** — نفس البند. مؤكد | **نعم** (ضمن CF2) |
| **J-03** | Distributions تُجلب كلها ثم تُفلتر في العميل — `limit(200)` قد يقطع | **✅ مؤكد جزئياً** — فلترة في العميل بدل الخادم. لكن: 200 توزيع لمستفيد واحد = حالة نادرة جداً (يحتاج 200 دفعة لنفس المستفيد). الأثر العملي ضعيف | **لا** (نادر) |
| **J-04** | AdvanceRequestDialog بـ `estimatedShare=0` عند `all` | **❌ سلوك صحيح** — عند `all`: `estimatedShare=0` → `maxAdvance=0` → زر معطّل. المستفيد لا يستطيع طلب سلفة بدون تحديد سنة. هذا صحيح منطقياً | لا |
| **J-05** | BeneficiarySettingsPage بلا guard عند `!currentBeneficiary` | **✅ مؤكد** — بعد `benLoading` guard (سطر 161)، الصفحة تعرض مباشرة بدون فحص `!currentBeneficiary`. الحقول تعرض `'—'` فقط | **نعم** |
| **J-06** | DisclosurePage: `finError` يعرض `NoPublishedYearsNotice` | **✅ مؤكد** — سطر 205-213: عند خطأ شبكة، تعرض "لا توجد سنوات منشورة" بدل رسالة خطأ. **مضلل** | **نعم** |
| **J-07** | `useMyAdvanceRequests` لا يُفلتر بالسنة | **✅ مؤكد** — سطر 68-73: يجلب كل السُلف بدون `fiscal_year_id`. لكن الأثر **مقبول**: سجل السُلف الشامل مفيد للمستفيد ليرى تاريخه الكامل | **لا** (بالتصميم — سجل شامل) |
| **J-08** | CarryforwardHistoryPage يستعلم `beneficiaries` مباشرة | **❌ خطأ في التقرير** — سطر 33: يستعلم `beneficiaries_safe` وليس `beneficiaries`! `.from('beneficiaries_safe').select('id, name, share_percentage').eq('user_id', user.id)` | لا |
| **J-09** | تفضيلات الإشعارات في `localStorage` فقط | **✅ مؤكد** — لكن هذه **ميزة جديدة** وليست bug. الإشعارات تُرسل من الخادم بناءً على الأحداث، والتفضيلات المحلية تتحكم فقط في العرض المحلي. مؤجل | مؤجل |
| **J-10** | تضارب `currentAccount` بين ID و label | **❌ = BUG-AP2** — تم دحضه أعلاه. `findAccountByFY` يبحث بـ UUID أولاً | لا |

---

### الإصلاحات المطلوبة فعلياً — 4 تغييرات

**1. BUG-CF2 / J-02: رسالة توضيحية عند `myShare=0` في السنة النشطة**

**الملفات:** `MySharePage.tsx` و `DisclosurePage.tsx`

بعد بطاقات الملخص في MySharePage (بعد سطر 408)، إضافة:
```tsx
{myShare === 0 && !isAccountMissing && selectedFY?.status !== 'closed' && currentBeneficiary && (
  <Card className="shadow-sm border-info/30 bg-info/5">
    <CardContent className="p-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-sm">السنة المالية لم تُغلق بعد</p>
        <p className="text-sm text-muted-foreground mt-1">
          ستظهر حصتك من الريع بعد إغلاق السنة المالية من قِبل الناظر.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

نفس الرسالة في `DisclosurePage.tsx` بعد جدول الملخص المالي.

**2. BUG-FR2: guard لـ `isAccountMissing` في FinancialReportsPage**

**الملف:** `src/pages/beneficiary/FinancialReportsPage.tsx`

بعد guard `noPublishedYears` (سطر 139)، إضافة:
```tsx
if (isAccountMissing) {
  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-16 h-16 text-warning" />
        <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
        <p className="text-muted-foreground text-center max-w-md">
          لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

**3. J-05: guard لـ `!currentBeneficiary` في BeneficiarySettingsPage**

**الملف:** `src/pages/beneficiary/BeneficiarySettingsPage.tsx`

بعد `benLoading` guard (سطر 169)، إضافة:
```tsx
if (!currentBeneficiary) {
  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-16 h-16 text-warning" />
        <h2 className="text-xl font-bold">حسابك غير مرتبط</h2>
        <p className="text-muted-foreground text-center max-w-md">
          حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

**4. J-06: إصلاح `finError` في DisclosurePage**

**الملف:** `src/pages/beneficiary/DisclosurePage.tsx` سطر 205-213

استبدال `<NoPublishedYearsNotice />` برسالة خطأ حقيقية:
```tsx
if (finError) {
  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
        <p className="text-muted-foreground text-center max-w-md">
          يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
        </p>
        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" /> إعادة المحاولة
        </Button>
      </div>
    </DashboardLayout>
  );
}
```

---

### سجل البنود المؤجلة الكامل (للتنفيذ المستقبلي)

| # | البند | الوصف | السبب | الأولوية |
|---|-------|-------|-------|---------|
| DEFER-1 | M-3 | `noPublishedYears` guard مكرر في 14+ صفحة — نقله لـ HOC/Layout | تغيير هيكلي واسع يمس 14 ملف | متوسطة |
| DEFER-2 | BUG-MS1 | `myShare` بـ 5 تنفيذات — استخراج `useMyShare()` hook مشترك | refactoring واسع يحتاج اختبارات مكثفة | متوسطة |
| DEFER-3 | BUG-RD2 | `useBeneficiariesSafe` يُستدعى في كل `useRawFinancialData` حتى لو غير مطلوب | تحسين أداء — ليس bug | منخفضة |
| DEFER-4 | BUG-PERF1 | `vatKeywords` ثابتة تُنشأ داخل `useMemo` — نقلها لثابت خارجي | تحسين أداء طفيف | منخفضة |
| DEFER-5 | BUG-PERF2 | `computeTotals` يُعاد حسابه في 6 صفحات — React Query cache يخفف الأثر | تحسين هيكلي — context مشترك | منخفضة |
| DEFER-6 | J-09 | تفضيلات الإشعارات في `localStorage` — حفظها في DB | ميزة جديدة وليس bug | منخفضة |
| DEFER-7 | BUG-ST2 | `saveSetting` بلا debounce عند تغيير النسب | أداء — أثر ضعيف (حقل رقمي) | منخفضة |

---

### ملخص التأثير

- **4 ملفات** تُعدَّل: MySharePage, DisclosurePage, FinancialReportsPage, BeneficiarySettingsPage
- لا تغييرات في قاعدة البيانات
- **7 بنود** مسجلة للتأجيل مع أولوياتها
- جميع البنود الأمنية المدَّعاة (SEC1, SEC2) **تم دحضها** — RLS يحمي فعلياً

