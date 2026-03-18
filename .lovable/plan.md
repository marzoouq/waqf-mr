

## تحقق جنائي — نتائج الفحص المباشر لكل بند

تم قراءة كل ملف مصدري سطراً بسطر. النتائج الحقيقية:

---

### الحكم على كل بند

| # | الادعاء | النتيجة | يحتاج إصلاح؟ | السبب |
|---|---------|---------|-------------|-------|
| BUG-C1 | `isDeficit` مفقود في مسار السنة النشطة | ✅ مؤكد تقنياً | نعم (منخفض) | القيمة `undefined` لكن **لا يوجد أي مكون TSX يستهلك `isDeficit`** — البحث في كل ملفات `.tsx` أرجع 0 نتائج. إصلاح وقائي فقط |
| BUG-C2 | `waqfCorpusPrevious=0` بدون حساب مخزن | ❌ ليس خطأ | لا | سلوك صحيح — بدون `currentAccount` لا توجد بيانات ترحيل. هذا هو الـ fallback المتوقع |
| BUG-C3 | `fiscalYearId='all'` يُبطل `currentAccount` | ❌ ليس خطأ | لا | بالتصميم — لا يوجد حساب ختامي واحد لـ "كل السنوات". الـ fallback إلى `calculateFinancials` صحيح |
| BUG-C4 | `shareBase` stored vs live | ❌ ليس خطأ | لا | بالتصميم — السنة المقفلة تستخدم القيم المخزنة عمداً لأنها النهائية المعتمدة |
| **BUG-R2** | `__skip__` → `'all'` | **✅ مؤكد** | **نعم** | `useIncomeByFiscalYear` و `useExpensesByFiscalYear` يتحققان من `__none__` فقط ولا يتحققان من `__skip__`. عندما يُحوّل `useRawFinancialData` القيمة `__skip__` إلى `'all'`، تُرسل 3 طلبات HTTP لجلب **كل** البيانات بلا داعٍ. يحدث عند `useYoYComparison` بدون سنة سابقة |
| **BUG-M1** | CollectionHeatmap يعرض income لا تحصيلاً | **✅ مؤكد** | **نعم** | العنوان "خريطة التحصيل الشهري" لكن البيانات من جدول `income` (مدخلات محاسبية) وليس `payment_invoices` (فواتير مدفوعة). تضليل مباشر |
| BUG-Y1 | `prevContractualRevenue = 0` دائماً | ✅ مؤكد كـ stub | نعم (تنظيف) | الحقل موجود في الـ interface لكن **لا يُستهلك في أي مكون** (0 نتائج في `.tsx`). إزالة الـ stub أنظف من حسابه |
| BUG-R1 | `benLoading` يُعيق الداشبورد | ❌ ليس خطأ | لا | المستفيدون مُستخدمون فعلياً في بطاقة "المستفيدون النشطون" (سطر 149). تضمين `benLoading` صحيح |
| **BUG-M2** | ZATCA تُقطع عند 10 بلا إشعار | **✅ مؤكد** | **نعم** | `slice(0, 10)` بدون أي مؤشر على وجود المزيد |
| BUG-M3 | CollectionSummaryChart يعكس BUG-02 | ❌ تم إصلاحه | لا | الإصلاح السابق (BUG-02) حوّل `onTime`/`late` إلى عدد فواتير بدل عقود. الرسم الآن يعكس البيانات الصحيحة |

---

### الإصلاحات المطلوبة فعلياً — 4 فقط

**1. BUG-R2 (حرج): `__skip__` يُترجم إلى `'all'` في `useRawFinancialData.ts`**

| الملف | التغيير |
|-------|---------|
| `src/hooks/useRawFinancialData.ts` سطر 14 | تغيير المنطق: بدل تحويل `__skip__` إلى `'all'`، استخدام `enabled` flag لتعطيل الاستعلامات. عند `__skip__` أو `__none__`، يبقى `fyFilter = 'all'` كـ placeholder لكن الـ hooks لن تُنفَّذ لأن `enabled = false` |

لكن المشكلة أن `useIncomeByFiscalYear` و `useExpensesByFiscalYear` لا يقبلان `enabled` كمعامل خارجي — يتحققان داخلياً من `__none__` فقط. الحل الأبسط: تمرير `__none__` بدل `'all'` عند `__skip__`، لأن الهوكات الداخلية تتحقق من `__none__` وتُعطّل الاستعلام.

```typescript
// الحل:
const shouldSkip = !fiscalYearId || fiscalYearId === '__none__' || fiscalYearId === '__skip__';
const fyFilter = shouldSkip ? '__none__' : fiscalYearId;
```

هذا يعمل لأن `useIncomeByFiscalYear` و `useExpensesByFiscalYear` و `useAccountByFiscalYear` كلها تتحقق من `enabled: fiscalYearId !== '__none__'`.

**2. BUG-M1 (حرج): CollectionHeatmap يعرض income بدل تحصيل فعلي**

| الملف | التغيير |
|-------|---------|
| `src/components/dashboard/CollectionHeatmap.tsx` | تغيير الـ props من `income` إلى `paymentInvoices` مع فلترة `status === 'paid'` أو `partially_paid`. استخدام `paid_date` بدل `date` للتجميع الشهري |
| `src/pages/dashboard/AdminDashboard.tsx` سطر 443 | تغيير `<CollectionHeatmap income={income} />` إلى `<CollectionHeatmap paymentInvoices={paymentInvoices} />` |

**3. BUG-M2 (متوسط): ZATCA تُقطع عند 10 بلا إشعار**

| الملف | التغيير |
|-------|---------|
| `src/components/dashboard/PendingActionsTable.tsx` سطر 46 | حساب العدد الكلي قبل الـ `slice`، وإضافة صف تنبيهي في نهاية الجدول إذا كان العدد > 10: `+ X فاتورة أخرى` |

**4. BUG-C1 (وقائي): `isDeficit` مفقود في مسار السنة النشطة**

| الملف | التغيير |
|-------|---------|
| `src/hooks/useComputedFinancials.ts` سطر 91-102 | إضافة `isDeficit: false` في كائن الإرجاع للسنة النشطة (الحصص مصفّرة فالعجز لا ينطبق) |

---

### ملخص التأثير

- **3 ملفات** تُعدَّل فقط + تغيير استدعاء واحد في `AdminDashboard.tsx`
- لا تغييرات في قاعدة البيانات
- لا تغييرات في مكونات أخرى خارج النطاق

