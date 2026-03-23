

# إعطاء الناظر صلاحية التعديل الكاملة على السنوات المقفلة

---

## المشكلة

الناظر (admin) لا يستطيع تعديل البيانات في السنوات المقفلة رغم أن مشغل قاعدة البيانات (`prevent_closed_fiscal_year_modification`) يسمح له بذلك. السبب: **الواجهة الأمامية تحجب أزرار التعديل/الإضافة/الحذف بناءً على `isClosed` فقط دون التحقق من الدور**.

---

## التشخيص

| الطبقة | الحالة |
|--------|--------|
| **قاعدة البيانات** | ✅ المشغل يستثني الناظر — `NOT has_role(auth.uid(), 'admin')` |
| **الواجهة الأمامية** | ❌ تستخدم `disabled={isClosed}` و `!isClosed &&` بدون فحص الدور |

### الملفات المتأثرة (6 ملفات)

| الملف | عدد المواقع المحجوبة |
|-------|---------------------|
| `IncomePage.tsx` | 7 (أزرار إضافة + تعديل + حذف) |
| `ExpensesPage.tsx` | 5 (نموذج + أزرار تعديل + حذف) |
| `InvoicesPage.tsx` | 6 (إنشاء قالب + رفع + توليد PDF + تعديل + حذف) |
| `ContractAccordionGroup.tsx` | 2 (تسديد + إلغاء تسديد فواتير الدفعات) |
| `PaymentInvoicesTab.tsx` | 8 (توليد + تسديد جماعي + فردي + checkbox) |
| `ExpenseBudgetBar.tsx` | 1 (تعديل الميزانية) |

---

## خطة الإصلاح

### النهج: متغير `isLocked` يحل محل `isClosed` في شروط التعطيل

```typescript
const { role } = useAuth();
const isLocked = isClosed && role !== 'admin';
```

ثم استبدال كل `disabled={isClosed}` بـ `disabled={isLocked}` وكل `!isClosed &&` بـ `!isLocked &&`.

### التنفيذ بالتفصيل

**1. `IncomePage.tsx`** — إضافة `useAuth` + تعريف `isLocked` + استبدال 7 مواقع

**2. `ExpensesPage.tsx`** — نفس النمط + استبدال 5 مواقع + تمرير `isLocked` بدل `isClosed` لـ `ExpenseFormDialog`

**3. `InvoicesPage.tsx`** — هنا `isClosed` يأتي من `useInvoicesPage` hook، لذلك:
- إضافة `useAuth` في الصفحة
- تعريف `isLocked = h.isClosed && role !== 'admin'`
- استبدال 6 مواقع

**4. `ContractAccordionGroup.tsx`** — تغيير prop `isClosed` إلى تمرير `isLocked` من الأب (`ContractsPage.tsx`) + استبدال موقعين

**5. `PaymentInvoicesTab.tsx`** — نفس النمط — تغيير prop `isClosed` + استبدال 8 مواقع

**6. `ExpenseBudgetBar.tsx`** — تغيير prop `isClosed` + استبدال موقع واحد

**7. `ContractsPage.tsx`** (الأب) — إضافة `useAuth` + تعريف `isLocked` + تمريره للمكونات الفرعية

### رسالة السنة المقفلة

تغيير نص التنبيه ليعكس حالة الناظر:
- **للناظر:** "سنة مقفلة — لديك صلاحية التعديل"  (بلون أخضر)
- **لغيره:** "سنة مقفلة — لا يمكن التعديل" (بلون تحذيري كما هو)

---

## لا تغييرات مطلوبة على قاعدة البيانات

المشغل يعمل بشكل صحيح. الإصلاح بالكامل في الواجهة الأمامية.

