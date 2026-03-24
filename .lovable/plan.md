

# خطة إصلاح المشاكل المالية والمنطقية المكتشفة

---

## ملخص: 8 إصلاحات مرتبة بالأولوية

---

## 🔴 إصلاحات عالية الأولوية

### 1. إزالة fallback إلى `rent_amount` في `useAccountsCalculations.ts`

**المشكلة:** السطور 52 و 68 تستخدم `Number(c.rent_amount)` عند غياب التخصيص، بينما القاعدة #10 تنص على أن غياب التخصيص = 0.

**الإصلاح:** تغيير الـ fallback من `Number(c.rent_amount)` إلى `0` في كلا الموضعين (`commercialRent` و `totalAnnualRent`).

```typescript
// قبل
return sum + (allocation ? allocation.allocated_amount : Number(c.rent_amount));
// بعد
return sum + (allocation ? allocation.allocated_amount : 0);
```

### 2. إضافة دعم `allocationMap` لـ `computePropertyFinancials`

**المشكلة:** `contractualRevenue` و `activeAnnualRent` في `usePropertyFinancials.ts` يجمعان `rent_amount` الكامل بدون اعتبار التخصيص للسنة المالية.

**الإصلاح:** إضافة `allocationMap` كمعامل اختياري لـ `computePropertyFinancials`، واستخدامه في حساب `contractualRevenue` و `activeAnnualRent` عند توفره.

### 3. إصلاح `contractualRevenue` في `PropertiesPage.tsx` و `PropertiesViewPage.tsx`

**المشكلة:** كلا الصفحتين تحسبان `contractualRevenue` بجمع `rent_amount` الكامل بدون تخصيص.

**الإصلاح:** استخدام `allocationMap` (إن وُجد) لحساب القيمة الصحيحة، مع fallback إلى `rent_amount` فقط عند عرض "جميع السنوات".

---

## 🟡 إصلاحات متوسطة الأولوية

### 4. تعليم `getPaymentStatus` بـ `@deprecated` وتحويل الاستدعاءات

**المشكلة:** الدالة القديمة `getPaymentStatus` لا تزال مُستدعاة في `MobileUnitCard.tsx` و `DesktopUnitsTable.tsx`، بينما `getPaymentStatusFromInvoices` (الصحيحة) غير مُستخدمة في أي مكان.

**الإصلاح:**
- تعليم `getPaymentStatus` بـ `@deprecated`
- تحويل `MobileUnitCard` و `DesktopUnitsTable` لاستخدام `getPaymentStatusFromInvoices` مع تمرير الفواتير

### 5. إصلاح `isClosed: true` المُثبّت في `useAccountsCalculations.ts`

**المشكلة:** السطر 60 يُثبّت `isClosed: true` دائماً، مما يحسب الحصص والتوزيعات حتى للسنوات النشطة.

**الإصلاح:** تمرير `isClosed` كمعامل من المكوّن المستدعي بدلاً من تثبيته.

### 6. تحسين fallback الرسم البياني في `IncomeMonthlyChart.tsx`

**المشكلة:** عند غياب `paymentInvoices`، يُقسم `rent_amount / 12` وهذا غير صحيح للعقود السنوية التي تُدفع دفعة واحدة.

**الإصلاح:** إضافة تحذير في الكونسول عند استخدام الـ fallback الخطي، مع ملاحظة أن هذا الـ fallback نادر الحدوث (الفواتير متوفرة دائماً في الإنتاج). يمكن تحسينه بتوزيع المبلغ على شهر الاستحقاق بدلاً من توزيعه بالتساوي.

### 7. إزالة fallback رياضي في `CollectionReport.tsx`

**المشكلة:** `getExpectedPaymentsFallback` يحسب من `today - start_date` (محظور بالقاعدة #15).

**الإصلاح:** الدالة تُستخدم فقط عند `fiscalYearId === 'all'` (السطر 141). تعليمها بـ `@deprecated` وإضافة تعليق يوضح أنها fallback فقط لعرض "جميع السنوات" حيث لا يوجد تخصيص.

---

## 📋 ملاحظات لن تُعدّل الآن

| # | الملاحظة | السبب |
|---|---------|-------|
| `.env` في الـ repo | هذا ملف مُدار تلقائياً من Lovable Cloud — لا يمكن حذفه |
| غياب اختبارات | يُعالج كمهمة منفصلة لاحقاً |
| VAT على المتوقع بدل المحصّل | قرار محاسبي يحتاج مراجعة مع صاحب المشروع أولاً |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/financial/useAccountsCalculations.ts` | fallback → 0، `isClosed` كمعامل |
| `src/hooks/financial/usePropertyFinancials.ts` | إضافة `allocationMap` |
| `src/pages/dashboard/PropertiesPage.tsx` | استخدام التخصيص |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | استخدام التخصيص |
| `src/components/properties/units/helpers.ts` | `@deprecated` على الدالة القديمة |
| `src/components/properties/units/MobileUnitCard.tsx` | تحويل لـ `getPaymentStatusFromInvoices` |
| `src/components/properties/units/DesktopUnitsTable.tsx` | تحويل لـ `getPaymentStatusFromInvoices` |
| `src/components/dashboard/IncomeMonthlyChart.tsx` | تحسين fallback |
| `src/components/contracts/CollectionReport.tsx` | تعليم fallback بـ `@deprecated` |

