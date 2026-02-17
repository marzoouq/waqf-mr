

# إصلاح ترحيل رقبة الوقف للسنة المالية الجديدة

## المشكلة

عند إقفال السنة المالية 2024-2025، يقوم النظام بترحيل `remainingBalance` (= 0 ر.س) بدلا من `waqfCorpusManual` (= 107,913.20 ر.س) كرقبة وقف للسنة الجديدة.

حسب الكشف المالي المرفق:

```text
ريع الوقف القابل للتوزيع = 1,102,913.20 ر.س
التوزيعات                 =   995,000.00 ر.س
رقبة الوقف                =   107,913.20 ر.س  <-- المبلغ المطلوب ترحيله
```

**السبب:** السطر 351 في `AccountsPage.tsx` يستخدم `remainingBalance` بدلا من `waqfCorpusManual`.

---

## التعديلات المطلوبة

### 1. إصلاح منطق الترحيل في `AccountsPage.tsx`

**الملف:** `src/pages/dashboard/AccountsPage.tsx` - سطر 351

```typescript
// الحالي (خاطئ):
waqf_corpus_previous: remainingBalance,

// الجديد (صحيح):
waqf_corpus_previous: waqfCorpusManual,
```

**التفسير:** رقبة الوقف اليدوية (`waqfCorpusManual`) هي المبلغ الذي يحدده الناظر صراحة لترحيله كرأس مال للسنة التالية. أما `remainingBalance` فهو الفائض بعد خصم التوزيعات ورقبة الوقف معا.

### 2. تحديث رسالة الإشعار (سطر 368)

```typescript
// الحالي:
`... تم ترحيل الرصيد المتبقي (${remainingBalance.toLocaleString()} ر.س) ...`

// الجديد:
`... تم ترحيل رقبة الوقف (${waqfCorpusManual.toLocaleString()} ر.س) ...`
```

### 3. تحديث نص التأكيد (سطر 662)

```typescript
// الحالي:
ترحيل الرصيد المتبقي ({remainingBalance.toLocaleString()} ر.س) كرقبة وقف

// الجديد:
ترحيل رقبة الوقف ({waqfCorpusManual.toLocaleString()} ر.س) للسنة الجديدة
```

### 4. إدخال سجل الحساب الختامي المفقود لسنة 2025-2026

بما أن الإقفال تم سابقا ولم يتم ترحيل المبلغ الصحيح، يجب إدخال سجل أولي للسنة الجديدة:

```sql
INSERT INTO accounts (fiscal_year, waqf_corpus_previous, total_income, total_expenses,
  admin_share, waqif_share, waqf_revenue, vat_amount, distributions_amount,
  waqf_capital, net_after_expenses, net_after_vat, zakat_amount, waqf_corpus_manual)
VALUES ('2025-2026', 107913.20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
```

---

## ملخص التأثير

| البند | قبل الإصلاح | بعد الإصلاح |
|-------|------------|------------|
| المبلغ المرحل لـ 2025-2026 | 0 ر.س | 107,913.20 ر.س |
| سجل حساب 2025-2026 | غير موجود | موجود برقبة وقف مرحلة |
| رسالة الإشعار | "الرصيد المتبقي" | "رقبة الوقف" |

