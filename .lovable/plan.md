

## التحقق الجنائي — الطبقة الثالثة

### BUG-Y1: تم إصلاحه بالفعل
`prevContractualRevenue` محذوف من `useYoYComparison.ts` — تم التنظيف في الجولة السابقة. ✅

---

### فحص كل بند من الطبقة الثالثة

| # | الادعاء | النتيجة | إصلاح؟ | التحليل |
|---|---------|---------|--------|---------|
| **BUG-W1** | خوارزميتا collectionSummary مختلفتان | **✅ مؤكد** | **نعم** | AdminDashboard يحسب بالمبالغ (صحيح). WaqifDashboard يحسب بتعداد العقود (خاطئ) — نسبة مختلفة لنفس البيانات |
| **BUG-W2** | WaqifDashboard يستبعد expired | **✅ مؤكد** | **نعم** | يُصفي `activeContracts` فقط بينما AdminDashboard يشمل `expired`. يُصلح ضمن W1 |
| **BUG-K1** | progressColor='' عند عجز | **✅ مؤكد** | **نعم** | `expenseRatio > 100` → `progressColor = ''` → لا شريط. يجب إظهار شريط أحمر 100% |
| **BUG-K2** | WaqifDashboard لا يُظهر تنبيه عجز | **✅ مؤكد** | **نعم** | يُصلح ضمن W1 عند توحيد KPI |
| **BUG-P1** | limit 1000 صامت | **✅ مؤكد** | **نعم** | إضافة `logger.warn` عند الوصول للحد — تغيير بسيط |
| **BUG-P2** | invalidateQueries شامل | **❌ بالتصميم** | لا | `pay_invoice_and_record_collection` يُنشئ سجل income جديد — لا نعرف أي سنة تأثرت. الإبطال الشامل آمن ومقبول |
| **BUG-A1** | staleTime 10s + all | **❌ بالتصميم** | لا | التعليق يوضح: "عمليات مالية حساسة". و `limit(100)` يمنع الحمل الزائد. 10s مقبول لسُلف معلقة |
| **BUG-A2** | pendingAdvances يشمل سنوات مغلقة | **❌ ليس خطأ** | لا | عند `all` يُمرر `undefined` → يجلب كل السُلف. السُلف المعلقة من سنوات مغلقة **يجب** أن تظهر — هي معلقة بانتظار قرار |
| **BUG-D1** | new Date() آلاف المرات | **✅ مؤكد** | **نعم** | تحسين أداء بسيط — cache `now` خارج filter |
| **BUG-D2** | Date.now() داخل useMemo | **❌ بالتصميم** | لا | يُعاد الحساب فقط عند تغيير `fyContracts`. سلوك متوقع ومقبول |
| **BUG-FW1** | financialProgress يقارن بـ contractualRevenue كامل | **❌ بالتصميم** | لا | `contractualRevenue` = القيمة السنوية الكاملة للعقود. المقارنة مع `totalIncome` تعطي صورة واقعية عن التقدم. العقود التي بدأت منتصف السنة نادرة ولا تبرر تعقيد الحساب |
| **BUG-AR1** | useIncomeComparison بدون limit | **❌ ليس خطأ** | لا | الاستعلام مُقيَّد بـ `.in('fiscal_year_id', yearIds)` لـ 4 سنوات فقط. Supabase يُرجع 1000 صف كحد افتراضي. ولو تجاوز — الداتا هنا خفيفة (عمودان فقط: fiscal_year_id + amount) |
| **BUG-CS1** | Tooltip بدون وحدة | **✅ مؤكد** | **نعم** | تحسين UX بسيط — إضافة formatter للـ Tooltip |
| **BUG-CS2** | توثيق Props | **❌ تجميلي** | لا | المكون يُستخدم في AdminDashboard فقط. واضح من السياق |
| **BUG-K3** | deps ناقصة في kpis | **❌ ليس خطأ** | لا | KPI لا يعتمد على YoY — لا حاجة لإضافته في deps |
| **BUG-P3** | لا limit مختلف لسنة محددة | **❌ ليس خطأ** | لا | 1000 فاتورة لسنة واحدة = 83 عقد × 12 دفعة. نادر جداً |

---

### الإصلاحات المطلوبة — 6 تغييرات في 4 ملفات

**1. BUG-W1 + W2 + K2 (حرج): توحيد collectionSummary في WaqifDashboard**

**الملف:** `src/pages/beneficiary/WaqifDashboard.tsx`

استبدال خوارزمية `collectionSummary` (سطر 63-76) بنفس منطق AdminDashboard:
- فلترة العقود: `active` **و** `expired`
- حساب `totalExpected` و `totalCollected` بالمبالغ
- `percentage = (totalCollected / totalExpected) * 100`
- `onTime`/`late` = عدد فواتير (ليس عقود)
- تغيير العرض من `عقد` إلى `فاتورة` (سطر 270-276)
- إضافة تنبيه عجز لـ `expenseRatio > 100` في KPI (سطر 89)
- Cache `new Date()` خارج filter (BUG-D1)

**2. BUG-K1 (متوسط): شريط تقدم أحمر عند عجز مالي**

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 208

تغيير:
```typescript
progressColor: expenseRatio > 100 ? '' : (...)
```
إلى:
```typescript
progressColor: expenseRatio > 100 
  ? '[&>div]:bg-destructive' 
  : (expenseRatio <= 20 ? '[&>div]:bg-success' : expenseRatio <= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive')
```

**3. BUG-D1 (أداء): cache new Date() في AdminDashboard**

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 104-105

```typescript
const now = new Date();
const dueInvoices = paymentInvoices.filter(
  inv => relevantContractIds.has(inv.contract_id) && new Date(inv.due_date) <= now
);
```

**4. BUG-P1 (متوسط): تحذير عند الوصول لحد 1000**

**الملف:** `src/hooks/usePaymentInvoices.ts`

إضافة بعد `if (error) throw error;`:
```typescript
if (data && data.length >= 1000) {
  logger.warn(`payment_invoices query hit limit (1000) for fiscal year ${fiscalYearId}`);
}
```

**5. BUG-CS1 (تجميلي): Tooltip مع وحدة**

**الملف:** `src/components/dashboard/CollectionSummaryChart.tsx` سطر 34

إضافة `formatter` للـ Tooltip:
```typescript
<Tooltip 
  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
  formatter={(value: number) => [`${value} فاتورة`, undefined]}
/>
```

---

### ملخص التأثير

- **4 ملفات** تُعدَّل
- لا تغييرات في قاعدة البيانات
- لا مكونات جديدة
- التغيير الأهم: توحيد خوارزمية التحصيل بين الناظر والواقف (BUG-W1)

