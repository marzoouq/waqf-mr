

# تقرير الفحص الجنائي — التناقضات المكتشفة

---

## تناقض #1: PDF الوحدات — `rent_amount` يُعامل كشهري بدلاً من سنوي ⚠️ حرج

**الملف:** `src/utils/pdf/entities.ts` سطر 157-158

```typescript
const monthly = u.rent_amount || 0;  // يعامله كشهري!
const annual = monthly * 12;          // يضربه × 12 للسنوي!
```

**التناقض:** قواعد العمل تنص أن `rent_amount` **سنوي دائماً**، لكن PDF الوحدات يعامله كشهري ويضربه × 12. النتيجة: الإيجار الشهري في PDF = القيمة السنوية، والسنوي = 12 ضعف القيمة الحقيقية.

**السبب:** البيانات المُمررة من `PropertyUnitsDialog` (سطر 259) تمرر `tenant?.rent_amount` مباشرة — وهذه القيمة السنوية من جدول العقود.

**الإصلاح:** في `entities.ts`:
```typescript
const annual = u.rent_amount || 0;
const monthly = annual / 12;
```

---

## تناقض #2: رسم الإيرادات الشهري يفلتر `active` فقط ⚠️ متوسط

**الملف:** `src/components/dashboard/IncomeMonthlyChart.tsx` سطر 25

```typescript
const activeContracts = contracts.filter(c => c.status === 'active');
```

**التناقض:** نفس المشكلة التي أصلحناها في صفحات العقارات — في السنوات المقفلة (العقود `expired`)، المتوقع يظهر 0 بينما الفعلي يظهر أرقام حقيقية. نسبة التحصيل = ∞%.

**الإصلاح:** تمرير `isSpecificYear` والفلترة الشرطية كما في بقية المكونات.

---

## تناقض #3: جدول الاستحقاقات الشهري — 3 مشاكل (مخطط سابقاً)

**الملف:** `src/components/contracts/MonthlyAccrualTable.tsx`

1. **سطر 86:** يفلتر `active` فقط — فارغ في السنوات المقفلة
2. **سطر 90-94:** `referenceYear` محسوب من تواريخ العقود بدلاً من السنة المالية
3. **لا وعي بالسنة المالية:** لا يعرف حدود السنة المالية

---

## تناقض #4: `getMonthlyRent` — منطق `multi` غير متسق ⚠️ منخفض

**الملف:** `src/components/properties/units/helpers.ts` سطر 76-77

```typescript
if (tenant.payment_type === 'monthly') return safeNumber(tenant.payment_amount) || rent / 12;
if (tenant.payment_type === 'multi') return safeNumber(tenant.payment_amount) || rent / (tenant.payment_count || 1);
return rent / 12;
```

**التناقض:** للنوع `multi`، يُرجع `payment_amount` (مبلغ الدفعة الواحدة) كإيجار شهري — لكن `payment_amount` ليس شهرياً بالضرورة. مثلاً: عقد سنوي 60,000 ر.س مع 3 دفعات → `payment_amount = 20,000` → يعرض الشهري = 20,000 بدلاً من 5,000.

**الإصلاح:** الشهري دائماً = `rent / 12` كما في `usePropertyFinancials`.

---

## تناقض #5: ملخص المستفيد — `activeIncome` بدون وعي بالسنة المفتوحة ⚠️ متوسط

**الملف:** `src/pages/beneficiary/PropertiesViewPage.tsx` سطر 73-80

```typescript
if (isClosed && currentAccount) {
  activeIncome = safeNumber(currentAccount.total_income);
} else {
  activeIncome = (contracts ?? []).filter(c => c.status === 'active').reduce(...);
}
```

**التناقض:** عندما تكون السنة **مفتوحة لكن محددة** (ليست `all` وليست `closed`)، يفلتر `active` فقط. لكن يمكن أن تكون هناك عقود `expired` تنتمي لهذه السنة (عقد انتهى في منتصف السنة). الكود يتجاهلها.

**الإصلاح:** استخدام `isSpecificYear` بدلاً من `isClosed` فقط.

---

## تناقض #6: `UnitFormCard` — حساب `payment_amount` لا يشمل جميع الأنواع

**الملف:** `src/components/properties/units/UnitFormCard.tsx` سطر 30-31

```typescript
parseFloat(form.rent_amount) / (form.payment_type === 'monthly' ? 12 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1)
```

**التناقض:** للنوع `quarterly` يقسّم على 1 (يعتبره سنوي)، وللنوع `semi_annual` يقسّم على 1 أيضاً. النتيجة: `payment_amount` = القيمة السنوية الكاملة بدلاً من ربع أو نصف.

**الإصلاح:** إضافة `quarterly` و `semi_annual`:
```typescript
form.payment_type === 'quarterly' ? 4 : form.payment_type === 'semi_annual' ? 2 : ...
```

---

## ملخص

| # | التناقض | الخطورة | الملف |
|---|---------|---------|-------|
| 1 | PDF الوحدات: rent_amount يُعامل كشهري | **حرج** | `entities.ts` |
| 2 | رسم الإيرادات: يفلتر active فقط | متوسط | `IncomeMonthlyChart.tsx` |
| 3 | جدول الاستحقاقات: 3 مشاكل | متوسط | `MonthlyAccrualTable.tsx` |
| 4 | getMonthlyRent: multi يُرجع payment_amount | منخفض | `helpers.ts` |
| 5 | ملخص المستفيد: activeIncome بدون isSpecificYear | متوسط | `PropertiesViewPage.tsx` |
| 6 | UnitFormCard: quarterly/semi_annual يقسّم على 1 | متوسط | `UnitFormCard.tsx` |

## خطة الإصلاح

### الملفات المطلوب تعديلها:

| الملف | التغيير |
|-------|---------|
| `src/utils/pdf/entities.ts` | عكس monthly/annual ليتوافق مع rent_amount سنوي |
| `src/components/dashboard/IncomeMonthlyChart.tsx` | إضافة prop `isSpecificYear` + فلترة شرطية |
| `src/components/contracts/MonthlyAccrualTable.tsx` | إضافة props للسنة المالية + إصلاح الفلترة والسنة المرجعية |
| `src/pages/dashboard/ContractsPage.tsx` | تمرير السنة المالية لجدول الاستحقاقات |
| `src/components/properties/units/helpers.ts` | توحيد getMonthlyRent = rent/12 دائماً |
| `src/components/properties/units/UnitFormCard.tsx` | إضافة quarterly و semi_annual لحساب payment_amount |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | استخدام isSpecificYear في ملخص activeIncome |
| `src/pages/dashboard/DashboardPage.tsx` | تمرير isSpecificYear لرسم الإيرادات |

