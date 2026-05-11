# تدقيق شامل للوحة المستفيد (view-only) + إصلاحات

## النتيجة العامة

**الكود مُنضبط جداً.** فحص 15 صفحة + ~10 مكوّنات + ~12 hook لم يكشف أي خرق view-only ولا تسرّب PII ولا أزرار CRUD مخفية. المشاكل الحقيقية محدودة في 3 بنود.

---

## ما تم التحقق منه (سليم — لا يحتاج تعديل)

| الفحص | النتيجة |
|---|---|
| `console.*` في pages/components/hooks المستفيد | 0 |
| `as any` / `@ts-ignore` | 0 |
| `supabase.from(...)` مباشر في `pages/beneficiary/` | 0 |
| ألوان hex خارج Canvas/SVG | 0 |
| نمط Page Hook (لا useState/useEffect في الصفحات) | 15/15 |
| حالات `isLoading`/`isError` صريحة | 15/15 |
| استخدام `contracts_safe` بدلاً من `contracts` | في `useContractsViewPage` |
| `InvoiceGridView` يدعم `readOnly` ويُمرَّر من المستفيد | نعم |
| لا تسرّب PII (tenant_id_number/tax/CRN/address) في جداول العقود | مؤكد |
| RLS تمنع الكتابة ضمنياً (الكتابات المسموحة فقط: طلب سُلفة شخصية، تذكرة دعم خاصة، رد على محادثاته، تعليم/حذف إشعار) | مؤكد |

---

## المشاكل المكتشفة (3 إصلاحات)

### #1 — `CarryforwardHistoryPage` بدون `RequirePublishedYears` (أولوية عالية)

**الملف:** `src/pages/beneficiary/CarryforwardHistoryPage.tsx`

كل الصفحات المالية الأخرى محاطة بـ `RequirePublishedYears` لعرض رسالة واضحة عند عدم نشر سنة. هذه الصفحة تتخطّاه → قد تعرض جدولاً فارغاً أو خطأ مُربك.

**الإصلاح:** تغليف JSX الرئيسي بـ `<RequirePublishedYears>...</RequirePublishedYears>` بنفس نمط `MySharePage`/`DisclosurePage`.

---

### #2 — ربط معماري معكوس في `CarryforwardHistoryPage`

**الملف:** `src/pages/beneficiary/CarryforwardHistoryPage.tsx:16`

```ts
import { useCarryforwardData } from '@/hooks/page/admin/financial/useCarryforwardData';
```

صفحة مستفيد تستورد من مجلد admin → كسر الحدود المعمارية. الـ hook نفسه عام (يقرأ بيانات مستفيد واحد).

**الإصلاح:**
- فحص المستهلكين عبر `rg -l "useCarryforwardData" src`.
- نقل الملف إلى `src/hooks/page/shared/financial/` (إن استخدمه admin أيضاً) أو `src/hooks/page/beneficiary/financial/` (إن لم يستخدمه أحد غير المستفيد).
- تحديث جميع الاستيرادات.
- تشغيل الاختبارات الحالية.

---

### #3 — مجلد `components/beneficiary/admin/` مضلِّل

**الموقع:** `src/components/beneficiary/admin/`

يحتوي:
- `BeneficiaryFormDialog.tsx` — يستخدمه الناظر فقط.
- `DistributionHistory.tsx` — يستخدمه الناظر.
- `AdvanceRequestDialog.tsx` — الوحيد الخاص بالمستفيد.

**الإصلاح:**
- نقل `BeneficiaryFormDialog.tsx` و`DistributionHistory.tsx` إلى `src/components/admin/beneficiaries/`.
- نقل `AdvanceRequestDialog.tsx` إلى `src/components/beneficiary/my-share/`.
- حذف المجلد الفارغ بعد تحديث جميع الاستيرادات.

---

## خارج النطاق (للتوثيق)

- صفحات الواقف (`pages/waqif/`) — طلب منفصل إن لزم.
- لوحة المحاسب — محكومة بقاعدة محفوظة.
- لا تعديل على RLS (تأكيد المستخدم).

---

## ترتيب التنفيذ

1. **#1** — تعديل واحد آمن.
2. **#2** — نقل ملف + تحديث استيرادات.
3. **#3** — إعادة تنظيم 3 ملفات.

كل بند مستقل.

## ملخص تقني

| الملف | نوع التعديل |
|---|---|
| `CarryforwardHistoryPage.tsx` | تغليف JSX (~5 أسطر) |
| `useCarryforwardData.ts` | نقل + تحديث استيراد |
| `components/beneficiary/admin/*` | نقل 3 ملفات + تحديث 3-5 استيرادات |

**لا تعديل على:** RLS، Edge Functions، types، client.ts، migrations.