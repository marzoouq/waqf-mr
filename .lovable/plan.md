

## خطة شاملة: توحيد الأرقام + منع التجاوز + تحسين التجاوب

### المشكلة 1: تناقض الأرقام (عربي-هندي vs لاتيني)

**9 ملفات** تستخدم `toLocaleString('ar-SA')` للأرقام المالية بينما بقية النظام (~60 ملف) يستخدم `fmt()` اللاتيني. هذا ينتج أرقاماً مثل `١٦,٦٦٦٫٦٧` بجانب `16,666.67`.

| الملف | عدد الاستخدامات | التغيير |
|-------|----------------|---------|
| `InvoiceTemplates.tsx` (سطر 123) | `fmtNum` محلي | حذف + `import { fmt }` |
| `MonthlyAccrualTable.tsx` (سطر 37) | `fmtNum` محلي | حذف + `import { fmtInt }` |
| `ZakatEstimationReport.tsx` (سطر 106, 153) | 2 inline | استبدال بـ `fmtInt()` |
| `ContractFormDialog.tsx` (سطر 291, 350, 387, 395, 401) | 5 inline | استبدال بـ `fmt()` |
| `ExpenseFormDialog.tsx` (سطر 71) | 2 inline | استبدال بـ `fmt()` |
| `PropertyUnitsDialog.tsx` (سطر 670, 877) | 2 inline | استبدال بـ `fmtInt()` / `fmt()` |
| `CreateInvoiceFromTemplate.tsx` (سطر 322, 340-343) | 4 inline | استبدال بـ `fmt()` |
| `printDistributionReport.ts` (سطر 51-165) | ~15 inline | استبدال بـ `fmt()` |

**ملاحظة**: `toLocaleString('ar-SA')` للتواريخ تبقى كما هي — فقط الأرقام المالية تتغير.

---

### المشكلة 2: تجاوز الأرقام والعناوين الطويلة عن حدود البطاقات

**النهج المنهجي لمنع التجاوز على كل الشاشات:**

```text
┌─ البطاقة (Card) ──────────────────────┐
│  ┌─ أيقونة ─┐  ┌─ محتوى (min-w-0) ──┐ │
│  │  shrink-0 │  │  label (text-xs)    │ │
│  │           │  │  value (truncate    │ │
│  │           │  │    tabular-nums     │ │
│  │           │  │    text-base→xl)    │ │
│  └───────────┘  └────────────────────┘ │
└────────────────────────────────────────┘
```

**القواعد الأربع:**
1. **`min-w-0`** على الحاوي النصي — يسمح بـ `truncate` داخل `flex`
2. **`truncate`** على الأرقام الكبيرة والعناوين الطويلة — يقطع بـ `...` بدل التجاوز
3. **`text-base sm:text-xl`** — خط أصغر على الجوال
4. **`tabular-nums`** — عرض ثابت للأرقام يمنع القفز البصري

#### الملفات المتأثرة:

| الملف | المشكلة | الحل |
|-------|---------|------|
| `IncomePage.tsx` (سطر 241-263) | `text-xl` ثابت، بدون `min-w-0` | إضافة `min-w-0` + `text-base sm:text-xl` + `tabular-nums` |
| `ExpenseSummaryCards.tsx` (سطر 49-70) | `text-xl` ثابت، بدون `min-w-0` | نفس الحل |
| `ReportsPage.tsx` (سطر 297-321) | `text-lg sm:text-2xl` بدون `truncate` | إضافة `truncate` + `min-w-0` + `tabular-nums` |
| `AccountsSummaryCards.tsx` (سطر 63-127) | 14 خلية `text-base sm:text-xl` بدون `truncate` | إضافة `truncate` + `tabular-nums` |
| `ContractStatsCards.tsx` (سطر 45-69) | `truncate` فقط على الإيرادات — بقية البطاقات بدون | إضافة `min-w-0` + `tabular-nums` لكل البطاقات |
| `MobileCardView.tsx` (سطر 97) | `text-sm font-medium` بدون `truncate` للقيم | إضافة `truncate` + `tabular-nums` على عنصر القيمة |
| `WaqifDashboard.tsx` (سطر 206, 227) | بعض البطاقات بدون `tabular-nums` | إضافة `tabular-nums` |

---

### الملفات المعدّلة (15 ملف)

**توحيد الأرقام (8):** `InvoiceTemplates.tsx` · `MonthlyAccrualTable.tsx` · `ZakatEstimationReport.tsx` · `ContractFormDialog.tsx` · `ExpenseFormDialog.tsx` · `PropertyUnitsDialog.tsx` · `CreateInvoiceFromTemplate.tsx` · `printDistributionReport.ts`

**منع التجاوز (7):** `IncomePage.tsx` · `ExpenseSummaryCards.tsx` · `ReportsPage.tsx` · `AccountsSummaryCards.tsx` · `ContractStatsCards.tsx` · `MobileCardView.tsx` · `WaqifDashboard.tsx`

### النتيجة المتوقعة
- كل الأرقام المالية لاتينية موحّدة (16,666.67) في كامل النظام
- لا تجاوز للأرقام أو العناوين عن حدود البطاقات على أي حجم شاشة (360px+)
- أرقام مستقرة بصرياً بفضل `tabular-nums`
- تقارير الطباعة (`printDistributionReport`) متسقة مع بقية النظام

