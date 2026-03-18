

# خطة إصلاح المشاكل المتبقية

## الحالة الحالية بعد الفحص
بعد مراجعة الكود الفعلي، تبيّن أن **معظم المشاكل المذكورة في التقرير تم إصلاحها بالفعل** في الجولات السابقة:

- **MySharePage** — ✅ mobile cards موجودة (سطر 533-553)
- **SupportPage** — ✅ mobile cards + touch support للنجوم (سطر 71-108, 279)
- **HistoricalComparisonPage** — ✅ mobile cards + chart sizing (سطر 209-235, height=280, width=70)
- **PendingActionsTable** — ✅ mobile cards (سطر 86-112)
- **CarryforwardHistoryPage** — ✅ mobile cards (سطر 187-219)
- **ChartOfAccountsPage** — ✅ padding مُعدَّل
- **BeneficiaryMessagesPage** — ✅ لديها بالفعل نمط mobile routing صحيح (سطر 155: `selectedConv && 'hidden md:flex'` + زر رجوع سطر 192)

---

## المشاكل المتبقية فعلاً (4 مشاكل)

### 1. NotificationBell — Popover يتجاوز الشاشة على 360px
**السطر 53**: `className="w-80 md:w-96"` — عرض 320px على شاشة 360px = يتجاوز الحافة.
**الإصلاح**: إضافة `max-w-[calc(100vw-2rem)]` للحد من العرض.

### 2. WaqfInfoBar — نفس مشكلة Popover
**السطر 161**: `className="w-80 md:w-96"` — نفس المشكلة.
**الإصلاح**: إضافة `max-w-[calc(100vw-2rem)]`.

### 3. GlobalSearch — مخفي كلياً على الجوال بلا بديل
**السطر 209**: `hidden lg:block` — البحث الشامل غير متاح على الجوال.
**الإصلاح**: إضافة زر بحث (أيقونة) في الهيدر على الجوال يفتح Dialog بحث بنمط fullscreen.

### 4. HistoricalComparisonPage — PDF يصدّر أول سنتين فقط
**السطر 125-138**: `generateYearComparisonPDF` يمرر `d0, d1` فقط بغض النظر عن عدد السنوات المختارة.
**الإصلاح**: الدالة `generateYearComparisonPDF` مصممة لسنتين فقط (واجهتها `year1/year2`). الحل: تقييد زر التصدير لسنتين، أو عرض رسالة توضيحية عند اختيار أكثر من سنتين.

---

## الملفات المتأثرة
1. `src/components/NotificationBell.tsx` (سطر واحد)
2. `src/components/WaqfInfoBar.tsx` (سطر واحد)
3. `src/components/GlobalSearch.tsx` (إضافة زر mobile + Dialog)
4. `src/pages/dashboard/HistoricalComparisonPage.tsx` (توضيح/تقييد زر PDF)

