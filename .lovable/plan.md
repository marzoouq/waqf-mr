# Stage 6-5 — تنفيذ BeneficiaryAdvanceCard مع Dialog

## النطاق
استبدال زر التنقل في `BeneficiaryAdvanceCard` بـ `AdvanceRequestDialog` المُعاد استخدامه، مع توسيع `useBeneficiaryDashboardPage` لتمرير السياق الكامل دون استدعاءات RPC إضافية (نفس `useEndUserDashboardData` يوفّر كل الحقول).

## التغييرات (3 ملفات + توثيق)

### 1) `src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts`
إضافة كائن `advanceContext` واحد إلى القيم المُعادة:

```ts
advanceContext: {
  beneficiaryId: currentBeneficiary?.id ?? '',
  beneficiaryName: currentBeneficiary?.name ?? '',
  fiscalYearId: fiscalYearId ?? '',
  estimatedShare: myShare,
  paidAdvances: dashData?.paid_advances_total ?? 0,
  carryforwardBalance: dashData?.carryforward_balance ?? 0,
  isFiscalYearActive: !isClosed && !!fiscalYear,
  minAmount: advanceSettings.min_amount,
  maxPercentage: advanceSettings.max_percentage,
  enabled: advanceEnabled,
}
```
- صفر استدعاءات جديدة (كل الحقول من `dashData` الحالي)
- لا تغيير في باقي الحقول المُعادة

### 2) `src/components/beneficiary/dashboard/BeneficiaryAdvanceCard.tsx` (≤ 80 سطر)
- إزالة `useNavigate` و `ChevronLeft`
- استقبال `advanceContext` ككائن واحد + `pendingAdvanceCount`
- استبدال `<Button onClick={navigate(...)}>` بـ `<AdvanceRequestDialog ... />` (يأتي بـ Trigger داخلي)
- إضافة رابط ثانوي صغير `<Link to="/beneficiary/my-share">` للسجل الكامل أسفل الزر
- حين `!advanceContext.enabled || !advanceContext.isFiscalYearActive`: الزر مُعطّل ورسالة واضحة (لا إخفاء)
- صفر منطق/حساب داخل المكوّن

### 3) `src/pages/beneficiary/BeneficiaryDashboard.tsx`
- استخراج `advanceContext` من الـ hook
- تمريره: `<BeneficiaryAdvanceCard pendingAdvanceCount={...} advanceContext={advanceContext} />`
- إبقاء الحارس `isVisible('advance_card') && currentBeneficiary && isFyReady(fiscalYearId)` (إزالة شرط `advanceEnabled` لإظهار البطاقة معطّلة بدلاً من إخفائها — يحسّن الاكتشاف)

### 4) `.lovable/plan.md`
- نقل S6-5 من «مؤجَّل» إلى «منفَّذ»
- توثيق القرار: إعادة استخدام `AdvanceRequestDialog` بالخيار (1) الموسَّع

## خارج النطاق
- لا تعديل على `AdvanceRequestDialog` نفسه
- لا migrations / RLS / RPC جديدة
- لا تعديل `AuthContext` / `ProtectedRoute` / `client.ts` / `types.ts` / `config.toml`
- لا استخراج `useBeneficiaryAdvanceContext` (مكرّر 5 أسطر فقط — YAGNI)

## خطة التحقق
1. `bunx tsc --noEmit` نظيف
2. `bun run lint -- --max-warnings 0`
3. `bunx vitest run src/test/e2e/beneficiaryDashboardFlow.test.tsx` يمرّ
4. أحجام الملفات: البطاقة ≤80 سطر، الـ hook ≤155 سطر
5. تحقق يدوي على `/beneficiary`:
   - زر «طلب سلفة» يفتح Dialog محلياً (لا navigation)
   - عند `isClosed` أو `!advanceEnabled`: زر معطّل برسالة
   - رابط «عرض السجل الكامل» يعمل
   - بعد إرسال السلفة: realtime على `advance_requests` يحدّث `pendingAdvanceCount` تلقائياً (السطر 88-93 موجود)
