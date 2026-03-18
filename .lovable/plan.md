

# إصلاحات التقرير الجنائي التاسع — التحقق والخطة

## التحقق السريع من 24 بنداً

| # | البند | النتيجة | إصلاح؟ |
|---|-------|---------|--------|
| SHARE-01 | RPC فشل → myShare=0 صامت | **❌ مُصلح سابقاً** — `pctLoading` مُستخدمة في MySharePage سطر 281 و DisclosurePage سطر 189 | لا |
| SHARE-02 | لا validation على نتيجة RPC (>100 أو سالبة) | **✅ مؤكد** — `safeNumber(data)` يقبل أي رقم | **نعم** |
| SHARE-03 | myShare بدون تقريب | **✅ مؤكد** — سطر 38: `availableAmount * share% / totalBenPct` بدون `Math.round` | **نعم** |
| COMP-01 | isDeficit مفقود في المسار 2 (مغلقة + حساب) | **✅ مؤكد** — سطور 114-125 لا تُرجع `isDeficit` | **نعم** |
| COMP-02 | waqfCorpusManual خصم مزدوج | **❌ مدحوض** — `calculateFinancials` سطر 94: `waqfRevenue = netAfterZakat - admin - waqif` (بدون corpus). DB يخزّن `waqf_revenue` قبل خصم corpus. سطر 123: `storedWaqfRevenue - waqfCorpusManual` = صحيح | لا |
| COMP-03 | shareBase سالب في مسار 2 | **❌ مدحوض** — المسار 2 يستخدم `storedAdminShare` و `storedWaqifShare` مباشرة من DB. `shareBase` في سطر 119 للعرض فقط، لا يؤثر على الحسابات | لا |
| CTX-01 | useEffect على selectedId → render إضافي | **🟡 مقبول** — دورة واحدة فقط عند localStorage قديم. لا حلقة | لا |
| CTX-02 | race condition في تهيئة fiscalYearId | **🟡 مقبول** — `__none__` يمنع الاستعلامات أثناء التحميل. الاستعلامات الوهمية نادرة ومؤقتة | لا |
| CTX-03 | localStorage بدون UUID validation | **✅ مؤكد** — DoS عبر XSS ممكن (استعلامات فاشلة). الحل بسيط | **نعم** |
| ADV-03 | double submit أثناء Effect | **❌ مدحوض** — `disabled={create.isPending \|\| loading}` يمنعه (سطر 185) | لا |
| ADV-04 | effectiveShare fallback خاطئ | **❌ مدحوض** — الزر معطّل بـ `isFiscalYearActive` في السنة النشطة. والمعادلة `max(0, estimatedShare - carryforward)` ثم `max(0, result*50% - paid)` صحيحة رياضياً | لا |
| ADV-05 | طلب سلفة بدون fiscal_year_id | **✅ مؤكد** — `fiscalYearId === 'all' ? undefined : fiscalYearId` → `undefined` يُمرَّر لـ `handleSubmit` → يُحفظ بدون سنة | **نعم** |
| ADV-06 | serverData stale بين instances | **❌ مدحوض** — مستفيد واحد = Dialog واحد. `onOpenChange` يُعيد ضبط serverData | لا |
| CONTR-01 | عقود متعددة السنوات تختفي | **❌ مدحوض** — `contract_fiscal_allocations` table يُعالج التخصيص عبر السنوات. العقد يُربط بسنة بدايته بالتصميم | لا |
| CONTR-02 | غياب limit() في فلتر محدد | **🟡 مقبول** — عدد العقود لسنة واحدة محدود عملياً (<50) | لا |
| RAW-01 | خطأ واحد يُطفئ الكل | **🟡 مقبول بالتصميم** — `isError` يُظهر شاشة خطأ مع زر "إعادة المحاولة". أفضل من عرض أرقام ناقصة | لا |
| RAW-02 | settings فشل بدون إشعار | **❌ مدحوض** — `usingFallbackPct` يكتشفه (سطر 63-64) والتحذير يظهر في AdminDashboard عبر `usingFallbackPct` | لا |
| CONTEXT-01 | isAccountMissing بسلوك مختلف بالصفحتين | **✅ مؤكد** — MySharePage سطر 329: `isAccountMissing && isClosed`. DisclosurePage سطر 236: `isAccountMissing` فقط. سلوك مختلف في السنة النشطة | **نعم** |
| CONTEXT-02 | isClosed من 3 مصادر | **🟡 مقبول** — كل مصدر يخدم سياقاً مختلفاً (Context عام، صفحة محلية، حساب مالي). لا تناقض فعلي | لا |
| MATH-01/02 | waqfCorpusPrevious و VAT في shareBase | **📝 توثيق فقط** — قرارات فقهية موثّقة بالفعل في تعليق `calculateFinancials` سطور 41-63 | لا |
| ADV-HOOK-01 | myAdvances من كل السنوات | **🟡 مقصود** — جدول السُلف يعرض التاريخ الكامل. `paidAdvancesTotal` مُفلتر بالسنة | لا |
| ADV-HOOK-02 | limit(100) لكل السنوات | **🟡 مقبول** — مستفيد واحد نادراً ما يتجاوز 100 طلب | لا |
| STALE-01 | staleTime غير متسق | **🟡 مقبول بالتصميم** — العقود تتغير نادراً (60s)، السُلف تتغير بسرعة (10s). Memory note يؤكد هذا القرار | لا |

## الإصلاحات المطلوبة — 6 تغييرات في 5 ملفات

### 1. `src/hooks/useMyShare.ts` — تقريب myShare (SHARE-03)
سطر 38: إضافة `Math.round(...*100)/100` للتوافق مع `calculateFinancials`:
```ts
return Math.round(safeNumber(availableAmount) * safeNumber(currentBeneficiary.share_percentage) / totalBenPct * 100) / 100;
```

### 2. `src/hooks/useTotalBeneficiaryPercentage.ts` — validation (SHARE-02)
سطر 17: بعد `safeNumber(data)` أضف تحقق:
```ts
const result = safeNumber(data);
if (result <= 0 || result > 200) return 0; // قيمة غير منطقية → fallback آمن
return result;
```

### 3. `src/hooks/useComputedFinancials.ts` — إضافة isDeficit للمسار 2 (COMP-01)
سطر 114-125: أضف `isDeficit` في return object:
```ts
isDeficit: (storedWaqfRevenue - waqfCorpusManual) < 0,
```

### 4. `src/contexts/FiscalYearContext.tsx` — UUID validation (CTX-03)
سطر 22-25: إضافة تحقق UUID:
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const [selectedId, setSelectedId] = useState<string>(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    return UUID_RE.test(stored) ? stored : '';
  } catch { return ''; }
});
```

### 5. `src/components/beneficiaries/AdvanceRequestDialog.tsx` — guard fiscal_year_id (ADV-05)
سطر 74-76: إضافة guard في `handleSubmit`:
```ts
if (!fiscalYearId) {
  toast.error('يجب تحديد السنة المالية قبل طلب السلفة');
  return;
}
```

### 6. `src/pages/beneficiary/DisclosurePage.tsx` — توحيد isAccountMissing guard (CONTEXT-01)
سطر 236: تغيير من `if (isAccountMissing)` إلى `if (isAccountMissing && selectedFY?.status === 'closed')` للتوافق مع MySharePage.

## ملخص

من أصل 24 بنداً: **6 للإصلاح**، **10 مدحوضة**، **8 مقبولة بالتصميم/مُصلحة سابقاً**.

