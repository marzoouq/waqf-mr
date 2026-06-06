## الهدف
تقسيم 5 مكونات (188-193 سطراً) إلى ملفات أصغر تبقى تحت 150 سطراً، مع الحفاظ الحرفي على السلوك والتوقيع العام (props + default export) لكل مكوّن — لا تغيير في المستهلكين ولا في منطق الأعمال.

## المبدأ التوجيهي
- استخراج **عرضي بحت** (presentational) إلى أبناء مجاورين في نفس المجلد أو في مجلد فرعي قائم.
- لا نقل لمنطق الأعمال إلى `utils/` ما لم يكن نقياً 100% (PwaUpdateNotifier فقط).
- props passthrough مع `memo` عند الجدوى (صفوف الجداول).
- لا تغيير في الاستيرادات الخارجية لكل مكوّن جذر.

## التغييرات

### 1) `MonthlyAccrualTable.tsx` (193 → ~95)
- مكان فرعي قائم: `src/components/contracts/accrual/`
- ملفات جديدة:
  - `AccrualDesktopTable.tsx` — جدول `md:` (rows + footer).
  - `AccrualMobileSummary.tsx` — كتلة الجوال (header + قائمة `MobileAccrualCard`).
- يبقى `MonthlyAccrualTable.tsx` يحتوي useMemo الحسابي + التوجيه بين العرضين + حالات Loading/Empty.

### 2) `AccountsContractsTable.tsx` (193 → ~80)
- مكان جديد: `src/components/accounts/contracts/`
- ملفات جديدة:
  - `AccountsContractsMobileList.tsx` — البطاقات + ملخّص الجوال.
  - `AccountsContractsDesktopTable.tsx` — جدول `md:` + الفوتر.
  - `originBadge.tsx` — Badge helper.
- يبقى `AccountsContractsTable.tsx` غلافاً يحسب الإجماليات ويوجّه.

### 3) `PwaUpdateNotifier.tsx` (188 → ~85)
- ملفات جديدة:
  - `src/lib/pwa/semver.ts` — `compareSemver`, `parsePart`, `hasPrerelease` (دوال نقية، عديمة الأثر الجانبي → `lib/` وليس `utils/` لأنها مجال PWA لا تنسيق عام).
  - `src/components/pwa/ChangelogDialog.tsx` — الـ Dialog + Map للسجل.
- يبقى `PwaUpdateNotifier.tsx` يحتوي `useEffect` ومنطق التحقّق من التحديث.

### 4) `VoucherFormDialog.tsx` (188 → ~95)
- مكان قائم: `src/components/expenses/vouchers/`
- ملفات جديدة:
  - `VoucherFormFields.tsx` — الـ grid الكامل (Name/ID/Phone/Amount/Method/Ref + Description + Signature).
- يبقى `VoucherFormDialog.tsx` يحتوي state + validate + submit + DialogFooter.

### 5) `DisclosureFinancialStatement.tsx` (188 → ~70)
- مكان قائم: `src/components/beneficiary/disclosure/`
- ملفات جديدة:
  - `DisclosureIncomeBlock.tsx` — قسم الإيرادات.
  - `DisclosureExpensesBlock.tsx` — قسم المصروفات + VAT.
  - `DisclosureWaterfallBlock.tsx` — التسلسل المالي الكامل (corpus → نت → ضريبة → زكاة → حصص).
  - `DisclosureMyShareCard.tsx` — بطاقة حصتي.
- يبقى المكوّن الجذر غلاف Card + تمرير props لكل قسم.

## التحقّق (بعد التنفيذ)
1. `wc -l` لكل ملف جديد ≤ 150 سطر، والملفات الأصلية ≤ 100 سطر.
2. `node scripts/audit-conventions-deep.mjs` — 0 Warning، Info ≤ 4 (الموجودة).
3. `node scripts/audit-structure.mjs` — لا انتهاكات جديدة.
4. `bunx vitest run` — جميع الاختبارات الحالية تمر (لا تغيير في API).
5. فحص `rg` للتأكد من أن استيرادات المستهلكين الخارجيين لم تتغيّر.

## تحديث التقرير
تعديل `audit/codebase-audit-2026-06-05.md`:
- نقل P1.2 من قسم "أُجِّلت" إلى قسم "المُنفَّذة" مع تفصيل الـ5 تقسيمات.
- تحديث جدول الملخص النهائي (P1: 4/4).