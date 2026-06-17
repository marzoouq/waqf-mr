# تدقيق منطق حساب الريع وتوزيع الحصص

## السياق (مُتحقَّق منه فعلياً)

**الصيغة المرجعية** في `src/utils/financial/fiscalYear/accountsCalculations.ts` (موثَّقة + مغطّاة بـ 15 اختبار):

```
grandTotal         = totalIncome + waqfCorpusPrevious
netAfterExpenses   = grandTotal − totalExpenses
netAfterVat        = netAfterExpenses − manualVat
netAfterZakat      = netAfterVat − zakatAmount
shareBase          = max(0, totalIncome − totalExpenses − zakatAmount)
adminShare         = shareBase × adminPercent% (سنة مقفلة فقط)
waqifShare         = shareBase × waqifPercent% (سنة مقفلة فقط)
waqfRevenue        = netAfterZakat − adminShare − waqifShare
availableAmount    = waqfRevenue − waqfCorpusManual
remainingBalance   = availableAmount − manualDistributions
حصة المستفيد       = availableAmount × (نسبته / مجموع النسب) — Largest Remainder
```

**ملاحظات مهمة** (من الذاكرة المُطبَّقة تلقائياً):
- السنة النشطة: الحصص = 0 ديناميكياً.
- السنة المقفلة: snapshot من DB.
- Server-side authority: `execute_distribution` يُعيد حساب الحصص متجاهلاً قيم العميل.
- Corpus يُستخرج من Waqf Revenue (لا تكرار).
- Math.max(0) لمنع الحصص السالبة.

## ما سيُنفَّذ — تدقيق فقط (لا تعديل كود)

### المرحلة 1: تقرير تدقيق شامل
يُنتج subagent تقرير يغطي:
1. **التطابق عبر الطبقات** — هل `activeYearFinancials.ts` و `closedYearFinancials.ts` تستخدم نفس الصيغة؟
2. **`useMyShare.ts` + `myShareCalculation.ts`** — هل البَيس = `availableAmount` التناسبي أم شيء آخر؟
3. **`distributionCalcPure.ts`** (Largest Remainder) — هل المجموع == `availableAmount` بالضبط؟
4. **Server: `execute_distribution` RPC** — هل الصيغة تطابق العميل؟ فحص آخر migration.
5. **تقارير PDF** — `annualDisclosurePdf`, `comprehensiveBeneficiary`, `aggregatedAnnualReport`, `ReportsPage.tsx`:
   - هل تعرض `adminShare/waqifShare/waqfRevenue/availableAmount/myShare` من نفس المصدر؟
   - هل أي تقرير يُعيد الحساب محلياً ببَيس مختلف؟
6. **فجوات تغطية الاختبار** — أي طبقة بلا اختبار.

**الإخراج:** `audit/forensic-2026-06-17/REVENUE-DISTRIBUTION-AUDIT.md` مع جدول الانحرافات (file:line + severity).

### المرحلة 2: عرض النتائج عليك
- لو 0 انحراف → تأكيد + إغلاق المهمة.
- لو وُجدت انحرافات → خطة منفصلة لكل واحد (P1: divergence in formula, P2: report base mismatch, P3: missing test).
- لا تعديل تلقائي بدون موافقتك.

### المرحلة 3 (شرطية): اختبار E2E تحقق
لو طلبت ضماناً عملياً:
- اختبار `revenueFlow.integration.test.ts` يُحاكي سنة مالية كاملة (دخل + مصروفات + VAT + زكاة) ويتحقق أن نتيجة `calculateFinancials` تساوي مجموع توزيعات `distributionCalcPure` + corpus + admin + waqif بالضبط.

## ما لن يُنفَّذ
- إعادة كتابة الصيغ (إلا بطلب صريح).
- تعديل DB migrations.
- إعادة هندسة hooks/types.

## الإخراج النهائي
1. تقرير `REVENUE-DISTRIBUTION-AUDIT.md` (≤200 سطر) — موجز، مرتّب حسب الخطورة.
2. ردّ مختصر يلخّص: عدد الانحرافات الحرجة، عدد الفجوات الاختبارية، توصية متابعة.

**الزمن:** subagent يحتاج ~3-5 دقائق للاستكشاف، ثم مراجعة سريعة.

موافق على البدء؟ أم تريد توسيع النطاق (مثلاً: تدقيق `tenant_payments` + `payment_invoices` كذلك)؟
