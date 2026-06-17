# D2 — إصلاح تطابق LRM بين الخادم والعميل

**التاريخ:** 2026-06-17 | **الأولوية:** P1 (High) | **الحالة:** ✅ مُنفَّذ

## المشكلة

دالة `execute_distribution` (SQL) كانت تَستخدم تقريب بسيط لكل مستفيد:
```sql
v_server_share := ROUND(v_available_amount * v_ben_record.share_percentage / v_total_pct, 2);
```
بينما العميل (`distributionCalcPure.ts`) يَستخدم **Largest Remainder Method** يَضمن مساواة المجموع للمتاح.

**مثال للاختلاف:** 3 مستفيدين بنسب 33.33/33.33/33.34 على 100 ر.س:
- العميل (LRM): 33.33 + 33.33 + 33.34 = **100.00 ✅**
- الخادم القديم: ROUND(33.33,2) + ROUND(33.33,2) + ROUND(33.34,2) = 33.33 + 33.33 + 33.34 = 100.00 (هنا متطابق بالصدفة)

**مثال يُظهر التباعد** — 7 مستفيدين بنسب 100/7 على 1000 ر.س:
- العميل (LRM): 142.86 × 6 + 142.84 = **1000.00 ✅** (بعد توزيع البواقي)
- الخادم القديم: ROUND(142.857..., 2) × 7 = 142.86 × 7 = **1000.02 ❌** فرق قرشين.

## التغيير

### Migration: `execute_distribution` → LRM
1. **Pre-pass** بـ CTE واحدة: حساب `floored` و `remainder_pennies` لكل مستفيد.
2. توزيع `ROUND((available − Σfloored) × 100)` قرشاً على أعلى N remainder (كسر التعادل بـ id تصاعدياً للاستقرار).
3. تخزين النتيجة في `v_shares jsonb` يُفهرس بـ `beneficiary_id`.
4. اللوب الرئيسي يَقرأ من `v_shares` بدل التقريب.
5. **حارس داخلي جديد:** `RAISE EXCEPTION` فوراً لو `ABS(Σshares − available) > 0.01`.

**لم يتغير:**
- توقيع الدالة (signature)، RETURN shape.
- منطق advances/carryforward/deficit/notifications.
- حارس `assert_fiscal_year_open` ومنع التكرار.
- `v_total_pct` (مجموع نسب كل المستفيدين، ليس فقط المُرسَلين).

### اختبار العميل (regression contract)
أُضيف 4 اختبارات في `src/utils/financial/distribution/distributionCalcPure.test.ts`:

```text
D2 LRM server/client parity contract
  ✓ مجموع cents = available cents بالضبط — 3 نسب كسرية على 100
  ✓ مجموع cents = available cents بالضبط — نسب أولية على 777.77
  ✓ مجموع cents = available cents بالضبط — 7 مستفيدين متساويين على 1000
  ✓ استقرار: نفس المدخلات تُعطي نفس المخرجات (deterministic)
```

**النتيجة:** 23/23 يمر (19 سابقاً + 4 جديدة).

### تحديث الذاكرة
- `mem://business-logic/finance/distribution-lrm-server-parity.md` — يَوثّق العقد.
- `mem://index.md` — مرجع تحت قسم Memories.

## التحقق

| الخطوة | النتيجة |
|---|---|
| Migration applied | ✅ (warnings خط الأساس فقط، لا جديد) |
| `vitest distributionCalcPure.test.ts` | ✅ 23/23 |
| نفس التواقيع المُستخدمة في `useDistribute.ts` | ✅ (لا تغيير في الواجهة) |

## ما لم يُنفَّذ (مُؤجَّل)

- **D1** (closed-year `availableAmount` clamp): موجة لاحقة.
- **D3** (`useMyShare.ts:52` fallback): يَحتاج توافق مع LRM الخادم الجديد — موجة لاحقة.
- **D4** (PDF row order in aggregated report): تجميلي.

## التحقق اليدوي بعد النشر (موصى به)

تنفيذ توزيع تجريبي على سنة test ثم:
```sql
SELECT 
  (SELECT SUM(amount) FROM distributions WHERE account_id = '<id>') AS sum_dist,
  (SELECT waqf_revenue - COALESCE(waqf_corpus_manual,0) FROM accounts WHERE id = '<id>') AS available;
```
يجب أن يكون الفرق ≤ 0.01.
