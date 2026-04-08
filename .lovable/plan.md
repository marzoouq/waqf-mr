

# خطة إضافة 8 اختبارات تغطية لـ `distributionCalcPure.ts`

## الملف المُعدَّل

`src/hooks/page/admin/distributionCalcPure.test.ts` — إضافة `describe('تغطية الفروع المتقدمة', ...)` بعد الـ describe الحالي.

## الحالات الثمانية مع القيم المتوقعة

| # | الحالة | المدخلات | المتوقع |
|---|--------|----------|---------|
| 1 | `user_id` ينتقل للنتيجة | `{id:'a', user_id:'uid-1'}` + `{id:'b', user_id:null}`, 1000, 50/50 | `result[0].beneficiary_user_id === 'uid-1'`, `result[1].beneficiary_user_id === null` |
| 2 | نسب لا تساوي 100% | 20% + 40% (مجموع 60%), مبلغ 600 | a=200, b=400 (⅓ و⅔ نسبياً) |
| 3 | ترحيل أكبر من المتبقي بعد السلف | حصة=500, سلف=400, ترحيل=300 | `carryforward_deducted=100` (لأن المتبقي بعد السلف=100), `net=0`, `deficit=200` |
| 4 | عجز من سلف + ترحيل | حصة=500, سلف=600, ترحيل=200 | `afterAdvances=0`, `carryforward_deducted=0`, `net=0`, `deficit=300` |
| 5 | 0% + 100% | مستفيدان, مبلغ=1000 | a(0%)=0, b(100%)=1000 |
| 6 | penny allocation: 100÷3 | 3 متساويين 33.33%, مبلغ=100 | مجموع=100 بالضبط, أحدهم 33.34 والباقي 33.33 |
| 7 | أصغر مبلغ (0.01) | مستفيد واحد 100%, مبلغ=0.01 | `share_amount=0.01`, `net=0.01` |
| 8 | سلف = الحصة بالضبط | حصة=500, سلف=500 | `net=0`, `deficit=0` |

## التحقق

تشغيل `npx vitest run src/hooks/page/admin/distributionCalcPure.test.ts --reporter=verbose` — 18 حالة ناجحة.

