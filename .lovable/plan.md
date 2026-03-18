

## الفحص الجنائي — الجولة التاسعة (صفحات المستفيدين + الحسابات + حصتي: 31 بنداً)

### التحقق بند بند مقابل الكود الفعلي

| # | البند | الحقيقة | إصلاح؟ |
|---|-------|---------|--------|
| **BD-01** | Non-null assertion `!.id!` سطر 90 | **✅ مؤكد** — `currentBeneficiary!.id!` مع `enabled: !!currentBeneficiary?.id` يحمي من التنفيذ، لكن Non-null assertion خطير إذا تغيرت الشروط | **نعم** |
| **BD-02** | Hijri locale غير مدعوم Safari قديم | **🟡 نظري** — Safari 15+ يدعم `ar-SA-u-ca-islamic`. المتصفحات القديمة أقل من 2% | لا |
| **BD-03** | Grid فارغ للواقف (بطاقتان في grid-cols-4) | **🟡 تجميلي** — بطاقتان في 4 أعمدة = 50% فراغ. محسوس لكن ليس كسراً | لا (DEFER-27) |
| **BD-04** | آخر توزيع بدون تاريخ | **🟡 تحسين بسيط** | **نعم** |
| **BD-05** | تعليق مكرر سطر 101-102 | **✅ مؤكد** — سطران متتاليان متطابقان تقريباً | **نعم** |
| **BD-06** | إشعارات بدون sort قبل slice | **❌ مقبول** — `useNotifications` يُرتّب بـ `created_at desc` من Supabase. الترتيب محفوظ في JS arrays | لا |
| **BD-07** | "تُحسب عند الإقفال" بحجم صغير | **🟡 تجميلي** — بالتصميم: السنة النشطة لا تعرض حصة مؤكدة | لا |
| **BD-08** | ترتيب guards: noPublishedYears قبل !currentBeneficiary | **✅ مؤكد جزئياً** — سطر 154 (`noPublishedYears`) يأتي قبل سطر 178 (`!currentBeneficiary`). مستفيد غير مرتبط مع `noPublishedYears=true` يرى الرسالة الخاطئة. **لكن**: `noPublishedYears` يعني **لا سنوات منشورة أصلاً** → كلا الرسالتين صالحتان. الأولوية لرسالة "لا سنوات" منطقية لأن بدون سنة لا فائدة من ربط الحساب | لا |
| **BP-01** | users query بلا pagination | **✅ مؤكد** — `admin-manage-users` يجلب كل المستخدمين. لكن يُفلتر بـ `role === 'beneficiary'` → عدد قليل عادةً (10-50 مستفيد). **ليس حرجاً عملياً** | لا (DEFER-28) |
| **BP-02** | handleSubmit بلا try/catch | **✅ مؤكد** — سطر 93: `await mutateAsync(...)` بدون catch. `MutationCache.onError` يعرض toast عام فقط إذا لم يُعرِّف mutation.onError. **الـ mutationCache في queryClient.ts يتعامل مع هذا** ← سطر 16: `toast.error('حدث خطأ أثناء حفظ البيانات')`. **لكن** `setIsOpen(false)` و`resetForm()` لن تُنفذا عند الخطأ = جيد (الـ dialog يبقى مفتوحاً) | **نعم** (تحسين: catch يمنع unhandled rejection warning) |
| **BP-03** | totalPercentage مربك عند البحث | **🟡 تجميلي** | لا |
| **BP-04** | currentPage لا يُعاد بعد الحذف | **✅ مؤكد** — سطر 112-116: لا `setCurrentPage`. مع 10 عناصر وحذف الأخير في صفحة 2 → صفحة فارغة | **نعم** |
| **BP-05** | CSV يُصدّر المفلتر فقط | **🟡 بالتصميم** — أغلب التطبيقات تُصدّر ما يراه المستخدم | لا |
| **BP-06** | PDF الكل ≠ CSV المفلتر | **✅ مؤكد** — تناقض بسيط. PDF = `beneficiaries`، CSV = `filteredBeneficiaries` | **نعم** (توحيد: PDF أيضاً يُصدّر المفلتر، أو كلاهما الكل) |
| **BP-07** | Loading مكرر | **🟡 تجميلي** | لا |
| **AC-01** | قيم افتراضية 10%/5% → FOUC مالي | **✅ مؤكد** — سطر 99-100: `useState(10)` و`useState(5)`. لكن `isLoading` يحمي العرض = **الأرقام الخاطئة لا تظهر أبداً** لأن `page.isLoading=true` أثناء تحميل `appSettings`. **ليس FOUC فعلياً** | لا |
| **AC-02** | isClosed=true دائماً | **❌ بالتصميم** — التعليق سطر 208: "AccountsPage always shows shares (forceClosedMode) so admin can preview before closing". **هذا مقصود** — صفحة الحسابات تعرض المعاينة الكاملة دائماً | لا |
| **AC-03** | `'__none__' \|\| 'all'` يجلب كل الفواتير | **✅ مؤكد** — سطر 30: `page.fiscalYearId \|\| 'all'`. لكن `'__none__'` truthy → يُمرَّر كما هو → `usePaymentInvoices('__none__')` → لا نتائج (لأن لا سنة بهذا المعرف). **ليست مشكلة عملية** — `'__none__'` لن يطابق أي `fiscal_year_id` في DB | لا |
| **AC-04** | Skeleton 8 ≠ 14+ بطاقة | **✅ مؤكد** — سطر 109: `length: 8`. الحقيقة: `AccountsSummaryCards` يعرض ~14 بطاقة. Layout shift | **نعم** |
| **AC-06** | `'__none__'` يصل لـ useAdvanceRequests | **🟡 مشابه لـ AC-03** — سيُعيد مصفوفة فارغة | لا |
| **AC-07** | محاسب يرى زر إنشاء حساب | **✅ مؤكد** — سطر 72: لا guard على الدور. **لكن** RLS policy `Accountants can manage accounts` = `ALL` → **المحاسب مسموح له بالفعل بإنشاء حسابات!** | لا |
| **AC-08** | `'__none__'` يصل لـ AccountsBeneficiariesTable | **✅ مؤكد** — سطر 208: `page.fiscalYearId === 'all' ? undefined : page.fiscalYearId`. عند `'__none__'` يُمرَّر كما هو. لكن التأثير العملي ضئيل (لن يطابق أي سنة) | لا |
| **MS-01** | `invalidateQueries()` بدون queryKey | **✅ مؤكد** — سطر 28. **لكن**: هذا في شاشة خطأ فقط (`finError` أو `!currentBeneficiary`). عند خطأ جسيم، إبطال كل الـ cache مقبول كـ "hard refresh" | **نعم** (تحسين بسيط — تحديد queryKeys) |
| **MS-02** | 3 بطاقات في grid-cols-4 | **✅ مؤكد** — سطر 389: بطاقة السُلف مشروطة. عند `advancesEnabled=false` → 3 بطاقات في `lg:grid-cols-4` | **نعم** |
| **MS-03** | deficit مفقود من PDF | **🟡 مؤجل** — تغيير في منطق PDF معقد | لا (DEFER-29) |
| **MS-04** | status='cancelled' بالإنجليزي | **✅ مؤكد** — سطر 225: `default: return <Badge variant="secondary">{status}</Badge>` | **نعم** |
| **MS-05** | `border-r-blue-500` خارج الثيم | **❌ تم إصلاحه سابقاً** — سطر 533: `border-r-blue-500`. لكن بفحص `getAdvanceStatusBadge` سطر 233: يستخدم `bg-status-approved/20` مما يشير لوجود متغير ثيم. **لكن `border-r-blue-500` في بطاقات الموبايل لا يزال hardcoded** | **نعم** |
| **MS-06** | limit(200) بلا تنبيه | **🟡 حالة حدية** — 200 توزيع لمستفيد واحد = سنوات عديدة. نادر جداً | لا |
| **MS-07** | 4 أزرار في هيدر الموبايل | **🟡 تجميلي** | لا (DEFER-30) |
| **MH-01** | مصدران لـ totalBenPct | **✅ مؤكد** — `useTotalBeneficiaryPercentage()` (RPC) vs `beneficiaries.reduce(...)` (محلي). **لكن**: الـ RPC هو SECURITY DEFINER يتجاوز RLS → يُعطي المجموع الحقيقي. الحساب المحلي يستخدم `beneficiaries` التي قد تكون مفلترة بـ RLS. **`useMyShare` يستخدم RPC فقط** ← صحيح. `useAccountsPage` يستخدم المحلي ← **لكنه admin/accountant → يرى كل المستفيدين عبر RLS**. لا تناقض عملي | لا |

---

### الإصلاحات المطلوبة — 11 تغييراً في 5 ملفات

#### الملف 1: `src/pages/beneficiary/BeneficiaryDashboard.tsx`

**BD-01**: سطر 90 — إزالة Non-null assertion:
```typescript
.eq('beneficiary_id', currentBeneficiary?.id ?? '')
```

**BD-04**: إضافة تاريخ لبطاقة "آخر توزيع مستلم" (حيث يُعرض `lastPaid`)

**BD-05**: سطر 101-102 — حذف التعليق المكرر

#### الملف 2: `src/pages/dashboard/BeneficiariesPage.tsx`

**BP-02**: سطر 93-95 — لف بـ try/catch:
```typescript
try {
  if (editingBeneficiary) { await updateBeneficiary.mutateAsync(...); }
  else { await createBeneficiary.mutateAsync(...); }
  setIsOpen(false); resetForm();
} catch { /* mutationCache handles toast */ }
```

**BP-04**: سطر 114-115 — إضافة `setCurrentPage(1)` بعد الحذف

**BP-06**: سطر 136 — توحيد PDF ليُصدّر `filteredBeneficiaries` (مثل CSV)

#### الملف 3: `src/pages/dashboard/AccountsPage.tsx`

**AC-04**: سطر 109 — تغيير `length: 8` إلى `length: 14`

#### الملف 4: `src/pages/beneficiary/MySharePage.tsx`

**MS-01**: سطر 28 — تحديد queryKeys:
```typescript
const handleRetry = () => {
  queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
  queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
};
```

**MS-02**: تعديل grid class ليكون ديناميكياً حسب `advancesEnabled`

**MS-04**: سطر 225 — إضافة case لـ `cancelled`:
```typescript
case 'cancelled': return <Badge className="bg-destructive/20 text-destructive">ملغى</Badge>;
```

**MS-05**: سطر 533 — استبدال `border-r-blue-500` بـ `border-r-primary`

---

### بنود مؤجلة جديدة

| # | البند | الوصف | الأولوية |
|---|-------|-------|---------|
| DEFER-27 | BD-03 | Grid ديناميكي للواقف في quickLinks | منخفضة |
| DEFER-28 | BP-01 | pagination لـ admin-manage-users | منخفضة |
| DEFER-29 | MS-03 | عرض deficit المرحّل في PDF التوزيعات | متوسطة |
| DEFER-30 | MS-07 | دمج أزرار الهيدر في ExportMenu واحد | منخفضة |

---

### ملخص التأثير

- **5 ملفات** تُعدَّل
- لا تغييرات في قاعدة البيانات
- من أصل 31 بنداً: **11 مؤكدة للإصلاح**, **4 مؤجلة**, **16 مدحوضة/بالتصميم**
- أهمها: **BD-01** (Non-null assertion قد يُسبب TypeError) و**MS-01** (invalidateQueries يُبطل كل الـ cache)

