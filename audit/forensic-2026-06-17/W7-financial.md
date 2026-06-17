# W7 — المنطق المالي E2E (الفحص الجنائي الثاني — 2026-06-17)

11 findings. الأبرز:

**🔴 CRITICAL (3):**
1. `invoicesService.ts:33` — `remove()` بلا حارس على status؛ يمكن حذف `partially_paid` invoice (مخالف Invoice Deletion Safeguard)
2. `reserve_icv` معرّف في types لكن **بلا call site** في TS — إن سقطت Edge Function بعد reserve تتسرّب slots بلا commit
3. `useDistributionCalculation.ts:41-44` — حساب التوزيع كلياً client-side قبل `execute_distribution` — race بين جلسات admin = double distribution محتمل

**🟠 HIGH (3):**
4. `accountsCalculations.ts:51` — `shareBase = income − expenses − zakat` (بدون VAT)، يخالف الصيغة الرسمية. **مفتوح: قد يكون مقصود (تعليق سطر 18 يقول الضريبة لا تُخصم من أساس الحصص)**
5. نفس الانحراف في `closedYearFinancials.ts:32`
6. `useDistributionAdvances.ts:33-37` — carryforward بـ `to_fiscal_year_id IS NULL` يُطبَّق على كل السنوات

**🟡 MEDIUM (5):**
7. `distributionCalcPure.ts:70-71` — `deficit` يُرجع لكن UI لا يمنع التوزيع
8. `useCreateAdvanceRequest` لا يتحقق من `max_advance` server قبل insert
9. `Math.floor` في collection يُنقص قسط
10. accrual table display-only — لا persist إذا كان مطلوباً
11. revenue recognition لا تميّز upfront vs periodic

**أسئلة معلّقة:** ICV atomicity داخل Edge Function، نية `shareBase`، server recalc في `execute_distribution`
