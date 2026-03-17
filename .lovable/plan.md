

# فحص مشاكل الواجهات — تقرير وخطة إصلاح

بعد مراجعة شاملة للكود، تم اكتشاف **8 مشاكل** في الواجهات تحتاج إصلاح:

---

## المشاكل المكتشفة

### 1. [خطأ RTL] محاذاة `text-left` في واجهة RTL — `TableHead` في `table.tsx`
**السطر 49:** مكون `TableHead` يستخدم `text-left` كقيمة افتراضية:
```
"h-12 px-4 text-left align-middle font-medium ..."
```
في واجهة عربية (RTL)، هذا يجعل عناوين الأعمدة محاذية لليسار بدلاً من اليمين. يظهر التأثير في **جميع الجداول** عبر النظام.

**الإصلاح:** تغيير `text-left` إلى `text-start` ليتبع اتجاه المستند تلقائياً (RTL → يمين، LTR → يسار).

### 2. [خطأ RTL] تقارير الميزانية تستخدم `text-left` — `BalanceSheetReport.tsx`
**~20 موضع** في ملف تقرير الميزانية يستخدم `text-left` مباشرة على `TableCell` للقيم المالية. في RTL الأرقام تظهر في الجهة الخطأ.

**الإصلاح:** استبدال `text-left` بـ `text-start` في جميع خلايا القيم المالية.

### 3. [خطأ RTL] زر إغلاق الحوار في الجهة الخطأ — `dialog.tsx`
**السطر 46:** زر الإغلاق (X) يستخدم `right-4` مما يجعله في اليمين دائماً. في RTL يجب أن يكون في اليسار.

**الإصلاح:** تغيير `right-4` إلى `end-4` (أو `ltr:right-4 rtl:left-4`).

### 4. [خطأ RTL] `DialogHeader` و`DialogFooter` تستخدم `text-left` و`sm:space-x-2`
**السطر 56:** `DialogHeader` يستخدم `sm:text-left` — يجب أن يكون `sm:text-start`.
**السطر 61:** `DialogFooter` يستخدم `sm:space-x-2` الذي لا يعكس في RTL — يجب استخدام `sm:gap-2` بدلاً منه.

### 5. [خطأ RTL] `DrawerHeader` و`SheetHeader` تستخدم `text-left`
**drawer.tsx السطر 47:** `sm:text-left` → يجب `sm:text-start`
**sheet.tsx السطر 71:** `sm:text-left` → يجب `sm:text-start`

### 6. [تحذير] قالب الفاتورة الاحترافي — مربع النوع محاذى بـ `text-left`
**InvoiceTemplates.tsx السطر 170:** `<div className="text-left space-y-2 shrink-0">` يجعل مربع "فاتورة ضريبية" في اليسار بينما الترويسة RTL.

**الإصلاح:** تغيير إلى `text-start` أو `ltr:text-left rtl:text-right`.

### 7. [تحذير] `PrintHeader` يستخدم `text-left` للتاريخ
**PrintHeader.tsx السطر 62:** تاريخ الطباعة محاذى بـ `text-left`.

**الإصلاح:** `text-start`.

### 8. [تحذير] `CashFlowReport` يستخدم `text-left` للقيم المالية
نمط مماثل لتقرير الميزانية — قيم مالية محاذاة لليسار.

**الإصلاح:** `text-start` في جميع المواضع.

---

## خطة التنفيذ

| # | الملف | الإصلاح | التعقيد |
|---|-------|---------|---------|
| 1 | `src/components/ui/table.tsx` | `text-left` → `text-start` في TableHead | منخفض |
| 2 | `src/components/ui/dialog.tsx` | `right-4` → `end-4`, `text-left` → `text-start`, `space-x-2` → `gap-2` | منخفض |
| 3 | `src/components/ui/drawer.tsx` | `text-left` → `text-start` | منخفض |
| 4 | `src/components/ui/sheet.tsx` | `text-left` → `text-start` | منخفض |
| 5 | `src/components/reports/BalanceSheetReport.tsx` | استبدال جميع `text-left` بـ `text-start` | منخفض |
| 6 | `src/components/invoices/InvoiceTemplates.tsx` | `text-left` → `text-start` | منخفض |
| 7 | `src/components/PrintHeader.tsx` | `text-left` → `text-start` | منخفض |
| 8 | `src/components/reports/CashFlowReport.tsx` | `text-left` → `text-start` | منخفض |

جميع الإصلاحات من نوع استبدال نصي بسيط — لا تتطلب تغييرات منطقية أو هيكلية.

