

# فحص جنائي — الميزانية العمومية: خطأ محاسبي هيكلي مؤكد

---

## 1. الخطأ المكتشف — حساب مزدوج (Double Counting)

### الإثبات الرياضي

من `accountsCalculations.ts`:
```text
waqfRevenue = netAfterZakat - adminShare - waqifShare
            = (grandTotal - expenses - VAT - zakat) - adminShare - waqifShare
```

في `BalanceSheetReport.tsx` سطر 43:
```text
totalEquity = adminShare + waqifShare + waqfRevenue + waqfCorpusManual  ← خطأ
```

**المشكلة:** `waqfCorpusManual` مقتطع **من داخل** `waqfRevenue`، وليس بنداً منفصلاً. إضافته يعني حسابه مرتين.

### التحقق الحسابي

```text
balanceCheck = totalAssets - totalLiabilities - totalEquity - distributionsAmount

= grandTotal - (exp + vat + zakat) - (admin + waqif + waq