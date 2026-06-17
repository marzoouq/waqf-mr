# تدقيق منطق الريع وتوزيع الحصص

**التاريخ:** 2026-06-17 | **النطاق:** حساب الريع + توزيع حصص الناظر/الواقف/المستفيدين + تطابق التقارير

## الصيغة المرجعية (Canonical)

```
grandTotal         = totalIncome + waqfCorpusPrevious
netAfterExpenses   = grandTotal − totalExpenses
netAfterVat        = netAfterExpenses − manualVat
netAfterZakat      = netAfterVat − zakatAmount
shareBase          = max(0, totalIncome − totalExpenses − zakatAmount)   ← VAT مُستبعَدة عمداً
adminShare         = round(shareBase × adminPct/100, 2)                  ← سنة مقفلة فقط
waqifShare         = round(shareBase × waqifPct/100, 2)                  ← سنة مقفلة فقط
waqfRevenue        = round(netAfterZakat − adminShare − waqifShare, 2)
availableAmount    = round(waqfRevenue − waqfCorpusManual, 2)
beneficiary_i      = LRM(availableAmount, pct_i, totalPct)
```

## الملفات المراجَعة

| الملف | الأسطر |
|---|---|
| `src/utils/financial/fiscalYear/accountsCalculations.ts` | 40–79 |
| `src/utils/financial/fiscalYear/activeYearFinancials.ts` | 9–31 |
| `src/utils/financial/fiscalYear/closedYearFinancials.ts` | 14–51 |
| `src/utils/financial/distribution/distributionCalcPure.ts` | 30–82 |
| `src/hooks/domain/financial/useMyShare.ts` | 44–54 |
| `src/utils/pdf/reports/annualDisclosurePdf.ts` | 50–132 |
| `src/utils/pdf/reports/comprehensiveBeneficiary.ts` | 19–54 |
| `src/utils/pdf/reports/aggregatedAnnualReport.ts` | 119–137 |
| `supabase/migrations/20260617180546_*.sql` (`execute_distribution`) | 154–364 |

## الانحرافات

| # | المكان | الفرق | الخطورة |
|---|---|---|---|
| **D1** | `closedYearFinancials.ts:36` | `availableAmount = max(0, raw)` بينما الـ canonical لا يَحجز السالب. المستهلك يقرأ 0 بدل قيمة العجز الحقيقية؛ يكتشفها فقط عبر `isDeficit`. | **Medium** |
| **D2** | SQL `execute_distribution:238` | حساب حصة المستفيد = `ROUND(available × pct/total, 2)` — تقريب بسيط بدلاً من LRM المُستخدم في العميل. مجموع حصص الخادم قد يختلف عن `availableAmount` بـ (N−1)×0.01. الحارس في السطر 337 يفحص `sum > available + 0.01` فقط ولا يَفرض المساواة. | **High** |
| **D3** | `useMyShare.ts:52` (fallback) | نفس تقريب D2 (بسيط، ليس LRM). درب نادر لأن المسار الأساسي يقرأ `serverMyShare` من RPC، لكنه يُعطي رقماً مختلفاً لمعاينة عند فشل الخادم. | **Low** |
| **D4** | `aggregatedAnnualReport.ts:134` | الـ PDF يعرض `waqfCorpusPrevious` **بعد** صف `waqfRevenue` بينما هو مُضاف للأعلى في الصيغة. مُضلِّل للقارئ. | **Low** (عرض فقط) |
| **D5** | `myShareCalculation.ts` المذكور في الذاكرة | الملف **غير موجود**. الموجود فقط `distributionCalcPure.ts`. | **Info** |

## تطابق التقارير

| التقرير | يحسب محلياً؟ | المصدر | الحالة |
|---|---|---|---|
| `annualDisclosurePdf` | لا | قيم مُمرَّرة | ✅ |
| `comprehensiveBeneficiary` | لا | `myShare` opaque | ✅ |
| `aggregatedAnnualReport` | لا | قيم مُمرَّرة | ⚠️ D4 ترتيب عرض |
| `DisclosurePage` / `MySharePage` | لا (يستخدم hooks) | `useDisclosurePage` + `useMyShare` | ✅ |

## حُرّاس القيم السالبة

| الحارس | الموقع | مُطبَّق؟ |
|---|---|---|
| `shareBase ≥ 0` | `accountsCalculations.ts:51`, `closedYearFinancials.ts:32` | ✅ |
| `availableAmount ≥ 0` | `closedYearFinancials.ts:36` فقط | ⚠️ يخالف canonical |
| `net_amount ≥ 0` لكل مستفيد | `distributionCalcPure.ts:70` | ✅ |
| `serverMyShare ≥ 0` | `useMyShare.ts:48` | ✅ |
| `v_server_net ≥ 0` | SQL:254–257 | ✅ |

## فجوات الاختبار

1. **لا اختبار** يتحقق `sum(server shares) == availableAmount` بالضبط لـ N > 1 (D2 untested).
2. **لا اختبار** لـ `closedYearFinancials` بحالة `rawAvailable < 0` يكشف D1.
3. **لا اختبار** يَفرض عقد LRM (المجموع == availableAmount) عند نِسَب كسرية مع بواقي.
4. **لا اختبار** لـ `activeYearFinancials` مع `netAfterZakat < 0`.
5. `myShareCalculation.ts` المُتوقَّع غير موجود — السطح كله غير مُغطّى.

## التوصيات (مرتَّبة)

1. **P1 — D2 (Server LRM):** تحديث `execute_distribution` ليستخدم Largest Remainder بدل التقريب البسيط، أو إعادة هندسة الحارس ليَفرض `sum == available` بدقة. تحقُّق آلي عبر اختبار SQL.
2. **P2 — D1 (Closed-year clamp):** إما إزالة الـ clamp في `closedYearFinancials` ليطابق canonical، أو توثيق صريح أن `availableAmount` للسنة المقفلة "محايد العجز" وإضافة `rawAvailableAmount` منفصل.
3. **P3 — اختبارات تغطية الفجوات (1–4).**
4. **P4 — D4:** إعادة ترتيب صف `waqfCorpusPrevious` في `aggregatedAnnualReport` ليُعرض ضمن `grandTotal` بأعلى الجدول.
5. **P5 — D5:** تحديث ذاكرة `mem://technical/financials/net-share-calculation-logic` لإزالة المرجع إلى `myShareCalculation.ts` (أو إنشاؤه كـ wrapper مُختبَر للـ fallback في `useMyShare`).

---
**خلاصة:** صيغة الريع في `calculateFinancials` سليمة ومُغطّاة (15 اختبار). الانحرافات الجوهرية اثنان: **D2 (High)** يمكن أن يُنتج فرق قروش في توزيع المستفيدين بين الخادم والعميل، و **D1 (Medium)** يُخفي العجز في واجهة السنة المقفلة. لا يوجد تقرير PDF يَحسب صيغة بنفسه — كلها تَعرض قيماً مُمرَّرة.
