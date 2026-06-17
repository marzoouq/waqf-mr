# P1 / D2 — تطابق LRM بين الخادم والعميل في `execute_distribution`

## السياق

- **العميل** (`distributionCalcPure.ts:30–82`) يستخدم **Largest Remainder Method**: floor كل حصة، ثم توزيع البواقي قرشاً قرشاً على أصحاب أكبر remainder. يضمن `sum == availableAmount` بالضبط.
- **الخادم** (`execute_distribution:238`) يستخدم `ROUND(available × pct / total_pct, 2)` لكل مستفيد. مجموع الخادم قد يختلف عن `availableAmount` بـ `(N−1) × 0.01` في أسوأ الحالات.
- النتيجة: معاينة العميل تُظهر مبلغاً، وبعد التنفيذ السجلات في `distributions` تجمع لرقم مختلف بفروق قروش.

## ما سيُنفَّذ

### 1) Migration — `execute_distribution` v2 (LRM)
استبدال جسم الدالة بحيث:

```text
A. تحميل قائمة المستفيدين (id, share_percentage) من جدول beneficiaries إلى متغير v_ben_array.
B. حساب exact_share و floored و remainder لكل مستفيد عبر CTE واحدة.
C. توزيع v_remaining_pennies = ROUND((available − Σfloored) × 100) على أعلى N remainder
   (مع كسر التعادل بـ id تصاعدياً لاستقرار النتيجة).
D. تخزين الناتج في jsonb map: v_shares := { ben_id: final_share, ... }.
E. اللوب الحالي يستبدل سطر 238 بـ:
      v_server_share := (v_shares->>v_beneficiary_id::text)::numeric;
F. تشديد الحارس بسطر 337:
      من: v_sum_distributions > v_available_amount + 0.01
      إلى: ABS(Σv_server_share − v_available_amount) > 0.01
   (يَفرض المساواة بدلاً من حدّ علوي فقط).
```

**حافظ على السلوك الحالي:**
- نفس signature الدالة، نفس RETURNS jsonb shape.
- نفس منطق advances/carryforward/deficit/notifications.
- نفس حارس `assert_fiscal_year_open` ومنع التكرار.
- نفس `SECURITY DEFINER` و `search_path = public`.

**نقطة قرار صغيرة** (سأختار الافتراضي ما لم تعارض):
- LRM يَستخدم **كل المستفيدين** من جدول `beneficiaries` (مطابقاً للعميل). لو أرسل العميل `p_distributions` بقائمة منقوصة → اللوب يَتجاهل المستفيدين غير المُرسَلين، لكن الـ pre-pass يَحسب لهم حصص (تُهدر). هذا يحافظ على نسبية الحصص بدقة. **بديل:** LRM فقط على المُرسَلين — أبسط لكن قد يُعطي نتيجة مختلفة عن العميل لو القائمتان مختلفتان. أُفضّل الأول.

### 2) اختبار JS regression (سريع، يَقفل العقد)
إضافة `src/utils/financial/distribution/distributionCalcPure.test.ts` (لو غير موجود) أو توسيعه:
- 3 حالات نِسَب كسرية ينتج عنها بواقٍ (مثلاً: 33.33/33.33/33.34, 1/3 لـ 100, أعداد أولية).
- assertion: `Math.round(sum(share_amount) * 100) === Math.round(availableAmount * 100)` بالضبط.

### 3) اختبار SQL تكاملي (اختياري — تأكيد فعلي)
عبر `psql` (read access متاح، لكن execute_distribution write — نحتاج migration للتجريب). البديل: Deno test لـ edge function؟ لا توجد edge function هنا. **القرار:** أُهمله؛ نعتمد على:
- مراجعتك للـ migration.
- اختبار JS كمرآة منطقية.
- يدوي بعد النشر: تنفيذ توزيع تجريبي على سنة test وفحص `distributions.amount` sum.

### 4) تحديث الذاكرة
إضافة قاعدة:
```
mem://business-logic/finance/distribution-lrm-server-parity
نوع: business-logic
المحتوى: execute_distribution يَستخدم LRM مطابقاً لـ calculateDistributions في العميل
        لضمان sum(server shares) == availableAmount بدقة القرش.
        الحارس يَفرض المساواة المُطلقة (|sum − available| ≤ 0.01).
```

### 5) تقرير تنفيذ
`audit/forensic-2026-06-17/D2-FIXED-LRM-PARITY.md` يَوثّق:
- قبل/بعد (snippet SQL).
- مثال numeric للمشكلة (3 مستفيدين بنسب 33.33/33.33/33.34 على 100 ر.س).
- نتيجة اختبار JS بعد الإصلاح.

## ما لن يُنفَّذ في هذه الموجة
- D1 (closed-year clamp): موجة لاحقة.
- D3 (useMyShare fallback): تابع لـ D2 — بعد توافق الخادم، الـ fallback يُحدَّث إلى LRM في موجة منفصلة.
- D4 (PDF row order): تجميلي — موجة لاحقة.

## التحقق الخماسي بعد التنفيذ
1. `bunx vitest run distributionCalcPure` → سُمَّر اختبار الـ LRM contract.
2. `bunx vitest run` كامل → 0 فشل.
3. مراجعة بصرية للـ migration diff.
4. (يدوي بعد النشر) تنفيذ توزيع تجريبي على سنة test + استعلام `SELECT SUM(amount) FROM distributions WHERE account_id = ...` ومقارنته بـ `accounts.waqf_revenue − waqf_corpus_manual`.

موافق على البدء؟
