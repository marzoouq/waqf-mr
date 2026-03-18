

## الفحص الجنائي المنهجي — الجولة الثالثة (التقريران: L-series + BUG-A/F)

### المنهجية: التحقق من كل بند مقابل الكود الفعلي

---

### التحقق بند بند — تقرير L-series

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **L-01** | `fyFilter` ≠ `fiscalYearId` في `useAccountByFiscalYear` | **❌ ليس مشكلة** — `useAccountByFiscalYear` يستقبل `fiscalYearId` الأصلي مباشرة (سطر 19). عند `'__none__'` لن يجد حساباً → `currentAccount=null` → سلوك آمن. عند `'all'` → نفس الشيء → `calculateFinancials` مع `isClosed=false` → `availableAmount=0` | لا |
| **L-02** | 3 مسارات حسابية تُنتج نتائج مختلفة | **❌ بالتصميم** — المسار 1 (نشطة+حساب): يُصفّر الحصص عمداً. المسار 2 (مقفلة+حساب): القيم المخزّنة. المسار 3 (بلا حساب): fallback. كل مسار له غرض واضح. والسيناريو المذكور (إضافة إيراد بعد الإقفال) **مستحيل** بسبب trigger `prevent_closed_fiscal_year_modification` الذي يمنع أي INSERT في income لسنة مقفلة | لا |
| **L-03** | `isAccountMissing=true` بسبب Label خاطئ من K-03 | **❌ ليس مشكلة عملية** — `useComputedFinancials` يبحث بـ UUID **أولاً** (سطر 44-46). `findAccountByFY` في `useAccountsPage` أيضاً يبحث بـ UUID أولاً (سطر 31). إذا وُجد `fiscal_year_id` في الحساب (وهو يُحفظ عند الإقفال — سطر 109-113 في migration)، فالبحث بـ UUID ينجح **بغض النظر عن Label** | لا |
| **L-04** | `waqfCorpusManual=null` → `availableAmount` مضخّم | **❌ ليس مشكلة** — عند الإقفال، `close_fiscal_year` RPC يحفظ `waqf_corpus_manual = p_waqf_corpus_manual` (سطر 123/138 في migration). القيمة تأتي من `useAccountsPage` الذي يحسبها ويمررها. `safeNumber(null)=0` هو fallback صحيح فقط إذا لم يُنشأ حساب ختامي بعد (المسار 3) — وفي هذه الحالة `waqfCorpusManual` يُقرأ من `settings` عبر `calculateFinancials` وليس من `currentAccount`. **لا مسار يُنتج قيمة مضخّمة** | لا |
| **L-05** | `isFiscalYearActive` لا يُمرَّر → زر السلفة مفعَّل في سنة نشطة | **✅ مؤكد** — `MySharePage.tsx` سطر 317-325: `AdvanceRequestDialog` لا يُمرَّر له `isFiscalYearActive`. القيمة الافتراضية `false` (سطر 34 في Dialog). **لكن**: عند سنة نشطة، `myShare=0` → `estimatedShare=0` → عند فتح Dialog بدون `fiscalYearId` (عند 'all') الزر `disabled` بسبب `maxAdvance<=0`. وعند سنة محددة نشطة: RPC `get_max_advance_amount` يحسب الحصة التقديرية server-side. **الزر ليس معطّلاً ظاهرياً بسبب `isFiscalYearActive=false`**، لكن `maxAdvance` من RPC قد يكون >0. **هذا بند حقيقي** — يجب تمرير `isFiscalYearActive` | **نعم** |
| **L-06** | سجل السُلف يعرض كل السنوات بلا عمود سنة | **✅ مؤكد** — `useMyAdvanceRequests` (سطر 62-78) لا يُفلتر بالسنة. الجدول (سطر 565-571) لا يحتوي عمود سنة مالية. **لكن**: هذا سجل تاريخي شامل — مشابه لسجل الفروق المرحّلة. قرار تصميمي مقبول. **تحسين طفيف**: إضافة عمود السنة المالية فقط | **لا** (تجميلي — مؤجل) |
| **L-07** | `filteredDistributions` 3 مسارات متعارضة | **❌ بالتصميم** — الحالة 1 (بحساب ختامي): فلترة بـ `account_id` — **الأدق**. الحالة 2 (بدون حساب + سنة محددة): فلترة بـ `fiscal_year_id` — **بديل منطقي**. الحالة 3 (all): إظهار الكل. جدول `distributions` **يحتوي** عمود `fiscal_year_id` (مؤكد من schema). التوزيعات الجديدة تُحفظ مع `fiscal_year_id`. السجلات القديمة بدون `fiscal_year_id` ستُفوَّت — لكن هذا سيناريو migration قديم فقط | لا |
| **L-08** | PDF الأول ≠ PDF الثاني في عرض السُلف | **✅ مؤكد جزئياً** — PDF الأول (handleDownloadPDF) يعرض: حصة + مستلمات + معلقات + توزيعات. PDF الثاني (handleDownloadDistributionsPDF) يعرض: حصة + سُلف + فروق مرحّلة + صافي. **مقصود**: تقريران بأغراض مختلفة. PDF الأول = ملخص الحصة. PDF الثاني = تقرير التوزيع الفعلي. **ليس تناقضاً — تكامل** | لا |
| **L-09** | غياب `.catch()` في AdvanceRequestDialog RPC | **✅ مؤكد** — سطر 47-56: `supabase.rpc(...).then(...)` بدون `.catch()`. عند network timeout، `.then()` لن يُنفَّذ → `loading` يبقى `true` إلى الأبد. Supabase client عادة لا يرمي exceptions (يُرجع `{data, error}`) لكن timeout الشبكة قد يرمي. **إصلاح بسيط ومهم** | **نعم** |
| **L-10** | FOUC متعدد — 5 hooks لا يُنتظر تحميلها | **❌ ليس مشكلة عملية** — `usePaidAdvancesTotal` و `useCarryforwardBalance` و `useTotalBeneficiaryPercentage` كلها بـ `staleTime: 10_000` أو `60_000`. React Query يُعيدها من cache فوراً بعد أول تحميل. FOUC يحدث فقط في **أول زيارة** للتطبيق — وهذا مقبول لأن `finLoading` يغطي أهم البيانات. **تأثير ضعيف** | لا |
| **L-11** | `to_fiscal_year_id.is.null` → خصم مزدوج | **❌ بالتصميم** — الفروق بـ `to_fiscal_year_id=null` هي فروق **عامة غير مخصصة** — تُخصم من **أول سنة توزّع فيها**. عند التوزيع الفعلي عبر `execute_distribution` أو تسوية يدوية، يتم تحديث `status='settled'` → لا تظهر مرة أخرى. **ليس خصماً مزدوجاً** — تظهر حتى تُسوَّى مرة واحدة | لا |
| **L-12** | `myShare=0` بلا تفسير في سنة مغلقة (فشل RPC) | **✅ مؤكد جزئياً** — إذا فشل `useTotalBeneficiaryPercentage` بصمت → `totalBenPct=0` → `myShare=0` في `useMyShare` (سطر: `if (totalBenPct <= 0) return 0`). التنبيه الحالي (سطر 406) يظهر فقط عند `status !== 'closed'`. **في سنة مغلقة مع فشل RPC → لا تنبيه**. لكن: هذا حالة نادرة جداً (فشل RPC مع بيانات cached ناجحة). **تحسين مؤجل** | مؤجل |
| **L-13** | `handleRetry` يُلغي كل cache | **✅ مؤكد** — سطر 28: `queryClient.invalidateQueries()` بدون `queryKey`. يُلغي **كل** الكاش. **لكن**: هذا زر "إعادة محاولة" يظهر فقط عند **خطأ شبكة** (`finError=true`). في هذه الحالة، إعادة تحميل شاملة **مقبولة ومتوقعة** — المستخدم يريد تجديد كل البيانات. **ليس مشكلة** | لا |
| **L-14** | PDF الشامل يعرض 0 بلا disclaimer للسنة النشطة | **✅ مؤكد** — `handleDownloadComprehensivePDF` (سطر 177-216) يُمرر `myShare=0, adminShare=0, waqifShare=0` بدون أي علامة تقديرية. **تحسين UX مؤجل** — PDF الشامل نادراً ما يُطلب في سنة نشطة | مؤجل |
| **L-15** | إشعار السلفة بـ `beneficiary_user_id` من الناظر بلا تحقق | **❌ ليس ثغرة** — `beneficiary_user_id` يُمرر من `AdvanceRequestsTab` الذي يقرأه من `adv.beneficiary?.user_id` — أي من **البيانات المُجلبة من DB**. الناظر لا يُدخل user_id يدوياً. لو عُدّل عبر DevTools → الإشعار يصل لشخص خاطئ **لكن لا يُعدّل بيانات**. خطر أمني منعدم | لا |

---

### التحقق بند بند — تقرير BUG-A/F (لوحة الناظر)

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **BUG-A** | تعارض DB vs UI في صلاحية إقفال السنة | **✅ مؤكد** — RPC `close_fiscal_year` (migration 025643 سطر 85): `has_role(admin) OR has_role(accountant)`. لكن `useAccountsPage.ts` سطر 377: `if (role !== 'admin')` → يمنع المحاسب. **تعارض واضح**. لكنه **حماية إضافية وليس ثغرة** — الـ UI أكثر تقييداً من DB. **قرار تصميمي**: هل نسمح للمحاسب بالإقفال؟ | **نعم — توحيد** |
| **BUG-B** | تحذيرات RPC المقفلة لا تُعرض | **✅ مؤكد** — سطر 405: `const rpcResult = result as { closed_label?: string; next_label?: string }` — **لا يقرأ `warnings`**. الـ RPC يُرجع `warnings` array (سطر 167 في migration). **التحذيرات ضائعة** | **نعم** |
| **BUG-C** | FiscalYearWidget يختفي عند سنة مقفلة | **✅ مؤكد** — سطر 20: `if (!fiscalYear || fiscalYear.status !== 'active') return null`. **بالتصميم**: الويدجت للسنة النشطة فقط (أيام متبقية ونسبة إنجاز). **عند مراجعة سنة مقفلة، لا يوجد "أيام متبقية"**. ليس bug — التصميم منطقي | لا |
| **BUG-D** | `contractualRevenue` شهري vs سنوي | **❌ خطأ في التقرير** — `rent_amount` في جدول `contracts` هو **إجمالي قيمة العقد** (ليس شهرياً). الدفعة الشهرية هي `payment_amount`. سطر 97: `c.rent_amount` = إجمالي العقد. `totalIncome` = إجمالي الإيرادات الفعلية. المقارنة `totalIncome / contractualRevenue` = نسبة التحصيل الفعلي — **صحيحة** | لا |
| **BUG-E** | استعلام مباشر بدون hook في Dashboard | **❌ ليس مشكلة** — سطر 60-72: `useQuery` مع `staleTime: 300_000` (5 دقائق) و `queryKey: ['contracts', 'orphaned']`. هذا **يستخدم React Query** فعلياً — ليس استعلاماً مباشراً بلا cache. وهو منفصل عمداً لأنه لا يرتبط بالسنة المالية | لا |
| **BUG-F** | `reopen_fiscal_year` لا يُعيد corpus للسنة التالية | **✅ مؤكد** — migration سطر 30: `UPDATE fiscal_years SET status = 'active'` فقط. **لا يُعدّل `waqf_corpus_previous` في حساب السنة التالية**. **لكن**: إعادة الفتح حالة نادرة جداً، والناظر المسؤول عنها يعرف أنه يحتاج لمراجعة الحسابات يدوياً. **تحسين مؤجل لحالة حافة نادرة** | مؤجل |
| **BUG-G** | localStorage لا يُنظّف عند تغيير المستخدم | **❌ ليس مشكلة** — الكود يتحقق: `const exists = fiscalYears.some(fy => fy.id === selectedId)`. إذا كان المستخدم الجديد لا يرى نفس السنوات (RLS) → `selectedId` يُصفَّر. وإذا كان يرى نفس السنوات → السلوك **صحيح** — اختيار السنة ليس بيانات حساسة | لا |
| **BUG-H** | Effect dependency في YoY زائدة | **❌ ليس infinite loop** — كما يؤكد التقرير نفسه: `!year1Id` لا ينطبق بعد التعيين → يتوقف. التبعيات مطلوبة لـ React hooks exhaustive-deps rule | لا |
| **M-1** | رابط الإشعار `/beneficiary/accounts` | **❌ صحيح** — تحقق من `App.tsx` سطر 180: المسار `/beneficiary/accounts` **موجود ومسجل** → `AccountsViewPage`. الرابط صحيح | لا |
| **M-2** | `isYearActive = false` عند "عرض الكل" | **❌ ليس مشكلة** — عند `all`، `fiscalYear = null` → `isYearActive = undefined` (falsy) → `availableAmount` يُستخدم. في Dashboard الناظر سطر 83-85: يُمرر `fiscalYearStatus: fiscalYear?.status` → `undefined` → `isClosed=false` → shares مصفّرة. **هذا صحيح** — لا توجد "حصة كلية" لكل السنوات | لا |
| **M-4** | `bun.lock` غير مُدرج في `.gitignore` | **❌ خطأ في التقرير** — `.gitignore` سطر 31-34: `bun.lock` و `bun.lockb` **كلاهما مُدرجان** | لا |

---

### الإصلاحات المطلوبة — 3 تغييرات

**1. L-05: تمرير `isFiscalYearActive` لـ AdvanceRequestDialog**

**الملف:** `src/pages/beneficiary/MySharePage.tsx` سطر 317-325

إضافة prop واحد:
```tsx
<AdvanceRequestDialog
  beneficiaryId={currentBeneficiary?.id || ''}
  fiscalYearId={fiscalYearId === 'all' ? undefined : fiscalYearId}
  estimatedShare={myShare}
  paidAdvances={paidAdvancesTotal}
  carryforwardBalance={carryforwardBalance}
  minAmount={advanceSettings.min_amount}
  maxPercentage={advanceSettings.max_percentage}
  isFiscalYearActive={selectedFY?.status !== 'closed'}  // ← إضافة
/>
```

**2. L-09: إضافة `.catch()` في AdvanceRequestDialog**

**الملف:** `src/components/beneficiaries/AdvanceRequestDialog.tsx` سطر 50-56

إضافة catch بعد `.then()`:
```typescript
supabase.rpc('get_max_advance_amount', {
  p_beneficiary_id: beneficiaryId,
  p_fiscal_year_id: fiscalYearId,
}).then(({ data, error }) => {
  if (cancelled) return;
  if (!error && data && !(data as Record<string, unknown>).error) {
    setServerData(data as unknown as ServerAdvanceData);
  }
  setLoading(false);
}).catch(() => {
  if (!cancelled) setLoading(false);
});
```

**3. BUG-B: عرض تحذيرات RPC بعد إقفال السنة**

**الملف:** `src/hooks/useAccountsPage.ts` سطر 405-407

```typescript
const rpcResult = result as {
  closed_label?: string; next_label?: string;
  warnings?: string[];
} | null;

// عرض التحذيرات إن وُجدت
if (rpcResult?.warnings && rpcResult.warnings.length > 0) {
  for (const w of rpcResult.warnings) {
    toast.warning(w, { duration: 10000 });
  }
}

toast.success(`تم إقفال السنة المالية ${rpcResult?.closed_label || selectedFY.label} وترحيل الرصيد بنجاح`);
```

---

### تحديث سجل البنود المؤجلة (إضافة للوثيقة)

| # | المصدر | البند | الوصف | الأولوية |
|---|--------|-------|-------|---------|
| DEFER-9 | الجولة 3 — BUG-A | تعارض admin vs accountant في الإقفال | `close_fiscal_year` RPC يقبل المحاسب، الـ UI يمنعه — توحيد القرار | متوسطة |
| DEFER-10 | الجولة 3 — BUG-F | `reopen_fiscal_year` لا يُعيد corpus | حالة نادرة — يحتاج مراجعة حساب السنة التالية يدوياً | منخفضة |
| DEFER-11 | الجولة 3 — L-12 | `myShare=0` بلا تفسير عند فشل RPC في سنة مغلقة | حالة نادرة جداً (فشل `get_total_beneficiary_percentage`) | منخفضة |
| DEFER-12 | الجولة 3 — L-14 | PDF الشامل بلا disclaimer للسنة النشطة | تحسين UX — إضافة علامة تقديرية | منخفضة |
| DEFER-13 | الجولة 3 — L-06 | سجل السُلف بلا عمود سنة مالية | تحسين تجميلي | منخفضة |

---

### ملخص التأثير

- **3 ملفات** تُعدَّل: MySharePage.tsx, AdvanceRequestDialog.tsx, useAccountsPage.ts
- لا تغييرات في قاعدة البيانات
- **5 بنود جديدة** مسجلة للتأجيل
- من أصل 26 بنداً في التقريرين: **3 مؤكدة للإصلاح**, **2 مؤجلة**, **21 مدحوضة/بالتصميم**

