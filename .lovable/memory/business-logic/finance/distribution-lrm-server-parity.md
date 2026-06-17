---
name: distribution-lrm-server-parity
description: execute_distribution uses LRM matching client calculateDistributions for exact cent parity
type: feature
---
`execute_distribution` (SQL) و `calculateDistributions` (TS) يَستخدمان نفس **Largest Remainder Method**:

1. لكل مستفيد: `floored = FLOOR(available × pct / total_pct × 100) / 100`.
2. توزيع `remaining_pennies = ROUND((available − Σfloored) × 100)` على أعلى N remainder (كسر التعادل بـ id تصاعدياً).
3. حارس داخلي في الخادم يَفشل التنفيذ إن كان `ABS(Σshares − available) > 0.01`.

**العقد:** `Σ(server shares) == available_amount` بدقة القرش لأي عدد مستفيدين/نسب كسرية.

أي تغيير في `distributionCalcPure.ts` يَستوجب تحديث migration `execute_distribution` ليطابقه (والعكس). اختبارات `distributionCalcPure.test.ts > D2 LRM server/client parity contract` تَقفل العقد على جانب العميل.

`v_total_pct` يُحسَب من **كل** جدول `beneficiaries` (ليس فقط المُرسَلين في `p_distributions`) — يطابق سلوك العميل عند تمرير القائمة الكاملة.
