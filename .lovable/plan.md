

## حالة جميع البنود — تم التحقق من الكود الفعلي

كل بند في هذا التقرير تم فحصه مباشرة في الملفات المصدرية. النتائج:

### ✅ تم إصلاحه سابقاً (4 بنود)

| # | البند | الدليل في الكود |
|---|-------|----------------|
| BUG-C1 | `isDeficit` مفقود | `useComputedFinancials.ts` سطر 102: `isDeficit: false` ← موجود |
| BUG-R2 | `__skip__` → `'all'` | `useRawFinancialData.ts` سطر 15-16: `fyFilter = shouldSkip ? '__none__' : fiscalYearId` ← مُصلح |
| BUG-M1 | Heatmap يعرض income | `CollectionHeatmap.tsx` سطر 19-21: `paymentInvoices: PaymentInvoice[]` ← مُصلح |
| BUG-M2 | ZATCA تُقطع بلا إشعار | `PendingActionsTable.tsx` سطر 28-34: `unsubmittedZatcaTotal` + `zatcaOverflow` ← مُصلح |

### ❌ ليست أخطاء — بالتصميم (5 بنود)

| # | البند | السبب |
|---|-------|-------|
| BUG-C2 | `waqfCorpusPrevious=0` بلا حساب | صحيح — بدون `currentAccount` لا توجد بيانات ترحيل. هذا الـ fallback المتوقع |
| BUG-C3 | `fiscalYearId='all'` يُبطل `currentAccount` | بالتصميم — لا يوجد حساب ختامي واحد لـ "كل السنوات". الحساب الديناميكي هو السلوك الصحيح |
| BUG-C4 | `shareBase` stored vs live | بالتصميم — السنة المقفلة تستخدم القيم المخزنة عمداً لأنها النهائية المعتمدة |
| BUG-R1 | `benLoading` يُعيق الداشبورد | المستفيدون مُستخدمون في بطاقة "المستفيدون النشطون". تضمين `benLoading` صحيح |
| BUG-M3 | CollectionSummaryChart عقود لا فواتير | تم إصلاحه ضمن BUG-02 السابق — النسبة الآن بالمبالغ المالية |

### 🧹 تنظيف متبقي (بند واحد)

| # | البند | الحالة |
|---|-------|--------|
| BUG-Y1 | `prevContractualRevenue: 0` دائماً | الحقل موجود في `YoYResult` interface لكن لا يُستهلك في أي مكون (0 نتائج في `.tsx`). **تنظيف فقط** — حذف الحقل من الـ interface والقيم المرجعة |

---

### خطة التنفيذ — بند واحد فقط

**الملف:** `src/hooks/useYoYComparison.ts`

حذف `prevContractualRevenue` من:
1. `YoYResult` interface (سطر 14)
2. القيمة المرجعة عند عدم وجود سنة سابقة (سطر 37)
3. القيمة المرجعة عند وجود سنة سابقة (سطر 44)

هذا تنظيف بسيط — حذف حقل stub غير مُستهلك. لا يؤثر على أي مكون آخر.
