# تدقيق معماري شامل — waqf-wise-net

> تحليل قراءة فقط. لا تغييرات على الكود. النتيجة العامة: **البنية صحية جداً** مع التزام قوي بالقواعد الموثّقة في الذاكرة (Page Hook Pattern، lib vs utils، logger، RTL، تسمية ثابتة). فيما يلي الملاحظات الفعلية المرتّبة من الأهم للأقل.

---

## الحالة العامة (مؤشرات قابلة للقياس)

| المؤشر | النتيجة | الحالة |
|---|---|---|
| إجمالي ملفات TS/TSX | 1091 | — |
| `console.*` خارج logger/tests | **0** | ممتاز |
| استيراد `supabase` مباشرة في `pages/` | **0** (إنتاج) | ممتاز |
| استيراد `supabase` مباشرة في `components/` | **0** (إنتاج) | ممتاز |
| استيراد `sonner`/`supabase` في `utils/` | **0** (إنتاج) | ممتاز |
| أكبر ملف إنتاج (باستثناء `types.ts` المُولَّد) | 238 سطر | يتجاوز سقف 200 |
| ملفات > 200 سطر (إنتاج) | ~7 ملفات | يحتاج تقسيم خفيف |
| TODO/FIXME | 4 فقط | منخفض جداً |
| barrels (`index.ts`) | 44 | معقول |

الانضباط مع `mem://conventions/*` و `Container vs Presentational` و `lib-vs-utils-boundary` ملحوظ ومُطبَّق فعلياً عبر الكود.

---

## 1) قضايا حرجة (يُستحسن معالجتها قريباً)

### 1.1 ازدواج مجلدي الهوكس المالية — `hooks/financial/` ↔ `hooks/data/financial/`
يوجد مجلدان متوازيان بمسمّيات متقاربة:

```text
src/hooks/financial/         ← useAccountsData, useComputedFinancials, useMyShare, useRawFinancialData ...
src/hooks/data/financial/    ← useAccounts, useAdvanceRequests, useContractAllocations, useCloseFiscalYear ...
```

- يكسر قاعدة فصل طبقات الهوكس (data hooks vs domain/computation hooks).
- يُصعّب على المساهم الجديد معرفة أين يضع هوك جديد.
- خطر: نسخ مكرر من نفس الاستعلام في الموقعين.

**التوصية**: توحيد القاعدة:
- `hooks/data/financial/` = استعلامات Supabase خام (CRUD/queries).
- `hooks/financial/` → إعادة تسميته إلى `hooks/domain/financial/` أو دمج محتواه داخل `hooks/page/.../` و `lib/services/`.

### 1.2 ملفات تتجاوز سقف 200 سطر المنصوص عليه في `mem://technical/architecture/container-vs-presentational-boundary`

| الملف | الأسطر |
|---|---|
| `src/utils/pdf/reports/forensicAudit.ts` | 238 |
| `src/utils/pdf/reports/comprehensiveBeneficiaryTables.ts` | 213 |
| `src/utils/export/printDistributionReport.ts` | 213 |
| `src/components/zatca/ZatcaCertificatesTab.tsx` | 207 |
| `src/utils/export/xlsx.ts` | 205 |
| `src/hooks/page/admin/financial/useCollectionData.ts` | 205 |

**التوصية**: تقسيم وظيفي (مثلاً فصل `buildHeader/buildBody/buildFooter` في تقارير PDF؛ فصل tabs الشهادات في ZATCA). لا أولوية قصوى — لكنها انحراف عن قاعدة معتمدة.

---

## 2) قضايا متوسطة الأهمية

### 2.1 مجلدات `utils/` بملف واحد
`utils/chart`, `utils/error`, `utils/fiscalYear`, `utils/fonts`, `utils/reports`, `utils/ui` — كل منها يحوي ملفاً وحيداً.

- إما توحيدها تحت `utils/{format,common}` لتقليل التشظّي،
- أو إبقاؤها مع إضافة `index.ts` صريح لكل واحدة ليكون التوسّع المستقبلي منظماً.

### 2.2 صفحات قريبة من حد المنطق (170–188 سطر)
`AnnualReportPage.tsx (188)`, `ReportsPage.tsx (182)`, `HistoricalComparisonPage.tsx (181)`, `UserManagementPage.tsx (171)`, `AccountsPage.tsx (170)`.

التحقق أظهر أنها **عرضية فعلياً** (لا `useState/useEffect` متعدد)، لكنها تقترب من سقف 200/180. مراقبة دون تدخل عاجل.

### 2.3 `src/contexts/` يحتوي 3 سياقات
`AuthContext`, `ContractsContext`, `FiscalYearContext` — مقبول. لا تكدُّس. لكن `ContractsContext.tsx` + `ContractsContextValue.ts` + `useContractsContext.ts` نمط جيد يستحق التوثيق كقالب للسياقات القادمة.

---

## 3) ملاحظات تحسينية اختيارية

### 3.1 Barrels (44 ملف `index.ts`)
الذاكرة (`mem://technical/architecture/barrel-import-rule`) تمنع barrel→barrel. لم أرصد انتهاكاً واضحاً، لكن مع 44 barrel ينبغي:
- إضافة قاعدة ESLint مخصصة (إن لم تكن موجودة) تمنع الاستيراد بين barrels.
- مراجعة دورية لتقليل barrels في المسارات قليلة الاستخدام (مثلاً `utils/contracts/index.ts` لا يصدّر سوى دالة واحدة).

### 3.2 توثيق طبقة `lib/services/` مقابل `lib/api/`
الفصل بين `lib/api/` (invoke/rpc primitives) و `lib/services/` جيد. يُستحسن README صغير في كل مجلد يُحدّد متى يُضاف ملف إلى أيٍّ منهما.

### 3.3 4 تعليقات `TODO/FIXME` فقط
ممتاز. تحويلها إلى GitHub issues وإزالتها من الكود سيُبقي القاعدة نظيفة.

### 3.4 تغطية الاختبارات للهوكس الجديدة
بعض هوكس `hooks/page/admin/financial/` (مثل `useExpensesPage`, `useIncomePage`, `usePaymentInvoicesTab`) لا أرى لها ملفات `.test.ts` مرافقة وفق سياسة "Vitest co-located".

---

## 4) ما هو نظيف ولا يحتاج تدخلاً

- ✅ فصل المسارات (`adminRoutes`/`beneficiaryRoutes`/`waqifRoutes`/`publicRoutes`) + `ProtectedRouteHelper`.
- ✅ `root-layout.tsx` مع `lazyWithRetry` و `DeferredRender` لتقليل JS الأولي.
- ✅ `queryClient` مركزي مع `QueryCache`/`MutationCache` و `notify` موحّد.
- ✅ التزام تام بـ `logger` بدلاً من `console.*`.
- ✅ عدم تسرّب `supabase` خارج `hooks/data/*` و `lib/services/*` في كود الإنتاج.
- ✅ `CODEOWNERS` يحمي المسارات الحساسة (`supabase/`, `AuthContext`, `SecurityGuard`).
- ✅ توثيق ذاكرة المشروع شامل ومُطبَّق (Page Hook Pattern، lib vs utils، CRUD factory، إلخ).

---

## خطة عمل مرتّبة (إن رغبت بتنفيذ التحسينات لاحقاً)

| # | الإجراء | الأولوية | الحجم التقديري |
|---|---|---|---|
| 1 | توحيد `hooks/financial/` و `hooks/data/financial/` تحت سياسة واضحة (data vs domain) | حرجة | متوسط (نقل + تحديث استيرادات) |
| 2 | تقسيم `forensicAudit.ts` و `comprehensiveBeneficiaryTables.ts` و `printDistributionReport.ts` إلى وحدات < 200 سطر | عالية | متوسط |
| 3 | تقسيم `ZatcaCertificatesTab.tsx` (207) إلى Tab + sub-sections | عالية | صغير |
| 4 | إضافة اختبارات مفقودة لهوكس `hooks/page/admin/financial/*` | متوسطة | متوسط |
| 5 | توحيد مجلدات `utils/` ذات الملف الواحد أو توثيق سبب الإبقاء | منخفضة | صغير |
| 6 | إضافة قاعدة ESLint تمنع barrel→barrel imports | منخفضة | صغير |
| 7 | تحويل 4 `TODO/FIXME` إلى issues وحذفها | اختيارية | تافه |
| 8 | README صغير في `lib/api/` و `lib/services/` يوضّح متى يُستخدم كل منهما | اختيارية | تافه |

---

**خلاصة**: المشروع منظَّم بشكل صحيح ومتوافق مع معايير الذاكرة بنسبة عالية. التحسينات أعلاه تجميلية في معظمها، ما عدا **البند #1** (ازدواج مجلدي الهوكس المالية) الذي يستحق قراراً معمارياً قبل أن يتضخم.

اضغط **Implement plan** إن أردت تنفيذ البنود بالترتيب، أو حدّد لي أيها فقط.
