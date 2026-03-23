

# تحقق جنائي من الخطة — النتائج

---

## 1. حالة الخطة: **قديمة — تم تنفيذ الإصلاحات بالفعل**

الخطة في `.lovable/plan.md` تصف إصلاحين، وكلاهما **مُطبّق فعلاً في الكود**:

| البند في الخطة | الحالة الفعلية |
|---------------|---------------|
| إضافة `isSpecificYear` لـ deps في `PropertiesPage.tsx` سطر 109 | ✅ **مُنفذ** — السطر 109 يتضمنها فعلاً |
| تغيير `netIncome` في `usePropertyFinancials.ts` إلى `activeAnnualRent - totalExpenses` | ✅ **مُنفذ** — السطر 120 يستخدم `activeAnnualRent` فعلاً |

---

## 2. مشكلة متبقية مكتشفة — لم تُذكر في الخطة

### خطأ stale closure في `PropertiesViewPage.tsx` (صفحة المستفيد) — أولوية عالية

**الملف:** `src/pages/beneficiary/PropertiesViewPage.tsx` سطر 91

مصفوفة الاعتمادات:
```
[properties, totalUnits, occupiedUnits, propertiesWithoutUnitsNoContract, contracts, expenses, isClosed, accounts, fiscalYearId]
```

المتغير `isSpecificYear` مُستخدم في أسطر 50, 53, 73, 79 لكنه **غير مُدرج في المصفوفة**. هذا نفس الخطأ الذي أُصلح في صفحة الناظر لكنه **لم يُصلح في صفحة المستفيد**.

---

## 3. التوصية

### الإجراء المطلوب
1. **تحديث الخطة** لتعكس أن الإصلاحين الأصليين مُنفذان
2. **إصلاح** `PropertiesViewPage.tsx` سطر 91 — إضافة `isSpecificYear` لمصفوفة الاعتمادات

### التنفيذ
**ملف واحد فقط:** `src/pages/beneficiary/PropertiesViewPage.tsx`
- تغيير سطر 91 بإضافة `isSpecificYear` في نهاية مصفوفة deps

