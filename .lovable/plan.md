

## الفحص الجنائي — الجولة الخامسة (تقرير M-series: 15 بنداً)

### المنهجية: التحقق من كل بند مقابل الكود الفعلي

---

### التحقق بند بند

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **M-01** | `fiscalYearId='all'` يُلغي `fiscalYearLabel` branch | **❌ ليس مشكلة عملية** — عند `'all'`: `.eq('fiscal_year_id','all')` → يجلب [] → `currentAccount=null` → `useComputedFinancials` السطر 44: `fiscalYearId='all'` truthy → يبحث `byId` → لا يجد → السطر 48: `fiscalYearLabel` undefined (لأن `selectedFY=null` عند `'all'`) → يعيد `null`. المسار 3 `calculateFinancials` يعمل مع `isClosed=false` → `availableAmount=0`. **والمستفيد لا يصل أبداً لـ `'all'`** — فقط الناظر | لا |
| **M-02** | بلا فلتر → جلب 100 حساب | **❌ لا يحدث عملياً** — `FiscalYearContext` يضمن أن `fiscalYearId` لا يكون فارغاً/undefined. عند `isLoading`: `'__none__'` → `enabled=false`. عند عدم وجود سنة: `'__none__'` للمستفيد أو `'all'` للناظر. لا مسار يُمرر `(undefined, undefined)` | لا |
| **M-03** | Fallback `fiscalYears[0]` خاطئ | **❌ بالتصميم** — `fiscalYears` مرتبة `start_date DESC` → `[0]` = الأحدث. عند غياب سنة `active`، الأحدث هو الاختيار المنطقي. ادعاء "لا يوجد UI للمستفيد لاختيار السنة" **خاطئ** — `FiscalYearSelector` موجود في `DashboardLayout` ويظهر لجميع الأدوار | لا |
| **M-04** | `role=undefined` → `fiscalYearId='all'` | **❌ ليس مشكلة أمنية** — `role=undefined` يحدث فقط لمستخدم مُصادَق بدون سجل في `user_roles`. `fiscalYearId='all'` لا يكشف بيانات — RLS تحمي كل جدول. الاستعلامات ستُرجع ما يسمح به RLS فقط. **وسيناريو مستخدم بلا دور هو حالة edge نادرة** يُعالجها `SecurityGuard` | لا |
| **M-05** | `isDeficit` لا يُفرّق بين نوعَي العجز | **❌ بالتصميم** — `isDeficit` مُستخدم فقط كـ boolean واحد في صفحة الحسابات (الناظر) لتلوين البطاقة. التفريق بين نوعَي العجز **لم يُطلب** — الناظر يرى `availableAmount` و `remainingBalance` منفصلَين ويفهم السبب | لا |
| **M-06** | خطأ 42501 يُبتلع بصمت | **✅ مؤكد جزئياً** — السطر 80-83 يُعيد `[]` عند `42501` بدون أي تسجيل. لكن: `beneficiaries_safe` View له `USING(true)` حالياً (أي SELECT مفتوح لـ authenticated) → **خطأ 42501 مستحيل عملياً**. ومع ذلك، إضافة `logger.warn` هي **ممارسة جيدة** للمستقبل | **نعم** (تحسين بسيط) |
| **M-07** | `jsonSettingCache` لا يُمسح عند invalidation | **❌ ليس مشكلة** — الكاش يقارن `raw` (السطر 61): `if (cached.raw === raw)`. عند `invalidateQueries` → React Query يُعيد الجلب → `raw` الجديد ≠ `raw` القديم → الكاش يُحدَّث تلقائياً. الكاش يحمي فقط من re-parse عند نفس القيمة. **لا يُعيد قيماً قديمة** | لا |
| **M-08** | `deficit` بلا `Math.round` في printShareReport | **✅ مؤكد** — السطر 36: `deficit = Math.abs(rawNet)` بدون round. مقابل `MySharePage` سطر 139: `Math.round(Math.abs(rawNet) * 100) / 100`. **فرق عملي ≤ 0.01 ر.س** — لكن توحيد المنطق مطلوب للتدقيق | **نعم** |
| **M-09** | `carryforward` كامل vs `actualCarryforward` | **✅ مؤكد وحرج** — `printShareReport` (سطر 34) يطرح `carryforward` كاملاً: `rawNet = myShare - advances - carryforward`. بينما `handleDownloadDistributionsPDF` (سطر 142-143) يحسب `actualCarryforward = Math.min(carryforward, afterAdvances)`. عند `advances > myShare`: التقرير المطبوع يُظهر deficit مضخّم والتقرير PDF يُظهر deficit صحيح. **تناقض مالي بين تقريرَين لنفس المستفيد** | **نعم** |
| **M-10** | `staleTime=60s` يخلق نافذة عمياء | **❌ مقبول** — 60 ثانية staleTime لبيانات السنة المالية مقبول. الإقفال عملية نادرة (مرة/سنة). والمستفيد يرى `myShare=0` أثناء السنة النشطة أصلاً → لا تناقض مرئي. RPC `get_max_advance_amount` يحسب server-side بغض النظر عن cache العميل | لا |
| **M-11** | ثغرة `enabled` مع `fiscalYearId=''` | **❌ لا يحدث** — تحليل التقرير نفسه يُثبت ذلك: `FiscalYearContext` لا يُمرر `''` أبداً (سطر 55: `selectedId || ...` → `''` falsy → يتجاوز). محمي بالتصميم | لا |
| **M-12** | `null as unknown as string` خطير | **❌ مقصود ومحمي** — هذا pattern لتمرير NULL لـ PostgreSQL RPC للحصول على كل السجلات. `enabled: isAuthorized` (سطر 47) يمنع غير المصرَّحين. الـ fallback (سطر 53-63) يستخدم `beneficiaries_safe` (View آمن) — **ليس ثغرة** | لا |
| **M-13** | Toast "2000 سجل" يظهر للمستفيد | **✅ مؤكد جزئياً** — السطر 42: الشرط `data.length >= PER_FY_LIMIT` (2000). **عملياً مستحيل** أن يصل مستفيد لـ 2000 سجل إيراد في سنة واحدة. Toast يظهر نظرياً لكن احتماله ~0% | لا (نظري) |
| **M-14** | render وسيطة بين `isLoading` states | **❌ ليس مشكلة** — `fiscalYearId='__none__'` أثناء التحميل → جميع hooks معطّلة (`enabled: id !== '__none__'`). لا render وسيطة بمحتوى خاطئ | لا |
| **M-15** | Flash "لم يُعثر على الحساب" بسبب selectedId قديم | **✅ مؤكد** — بين تحميل `fiscalYears` (isLoading→false) وتنفيذ useEffect (async): render واحدة تستخدم `selectedId` القديم. عملياً: `useAccountByFiscalYear` يجلب ببطء (network) → `isAccountMissing=true` لا يُعرض لأن `finLoading=true` يعرض Skeleton. **الـ Skeleton يحمي من Flash**. لكن التحسين المقترح (validation قبل الاستخدام) أنظف | **مؤجل** (DEFER-14) |

---

### الإصلاحات المطلوبة — 3 تغييرات

**1. M-06: إضافة logger.warn عند خطأ 42501**

**الملف:** `src/hooks/useBeneficiaries.ts` سطر 80-83

```typescript
if (error.code === '42501') {
  logger.warn('[useBeneficiariesSafe] RLS permission denied (42501) — returning empty', error.message);
  return [];
}
```

**2. M-08: توحيد Math.round في printShareReport**

**الملف:** `src/utils/printShareReport.ts` سطر 34-36

```typescript
const rawNet = myShare - advances - carryforward;
const net = Math.max(0, rawNet);
const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;
```

**3. M-09: توحيد منطق carryforward الفعلي في printShareReport**

**الملف:** `src/utils/printShareReport.ts` سطر 34-36 + السطر 76

```typescript
// حساب carryforward الفعلي (بعد خصم السُلف أولاً — مطابق لـ F7 في MySharePage)
const afterAdvances = Math.max(0, myShare - advances);
const actualCarryforward = Math.min(carryforward, afterAdvances);
const rawNet = myShare - advances - actualCarryforward;
const net = Math.max(0, rawNet);
const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;

// وفي HTML (سطر 76):
// استبدال carryforward بـ actualCarryforward
```

---

### بنود مؤجلة جديدة

| # | المصدر | البند | الوصف | الأولوية |
|---|--------|-------|-------|---------|
| DEFER-14 | الجولة 5 — M-15 | تصفية selectedId قبل الاستخدام في fiscalYearId | Skeleton يحمي حالياً لكن validation مبكر أنظف | منخفضة |

---

### ملخص التأثير

- **2 ملفات** تُعدَّل: `useBeneficiaries.ts`, `printShareReport.ts`
- لا تغييرات في قاعدة البيانات
- **1 بند جديد** مسجل للتأجيل (DEFER-14)
- من أصل 15 بنداً: **3 مؤكدة للإصلاح**, **1 مؤجل**, **11 مدحوضة/بالتصميم**
- تحديث `.lovable/plan.md` إلى الإصدار السادس

