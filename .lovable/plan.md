

# خطة إصلاح المشاكل المتبقية المؤكدة

بعد التحقق من الكود الفعلي، إليك الوضع الحالي وما يحتاج إصلاح فعلي:

## ما تم إصلاحه سابقا (مؤكد بالكود)

| المشكلة | الحالة |
|---------|--------|
| BottomNav — accountantLinks منفصلة | **تم** (سطر 21-26) |
| BottomNav — safe-area via inline style | **تم** (سطر 59) |
| MessagesPage — ارتفاع 11.5rem | **تم** (سطر 67) |
| ErrorBoundary — `href = '/'` | **تم** (سطر 45) |

## المشاكل المتبقية الحقيقية (10 إصلاحات)

### المجموعة 1 — إصلاحات UX عالية الأولوية

**1. DashboardLayout: القائمة الجانبية لا تُغلق عند تغيير المسار**
- الملف: `DashboardLayout.tsx` سطر 178
- الإصلاح: إضافة `useEffect` يُصفّر `mobileSidebarOpen` عند تغيير `location.pathname`

**2. MessagesPage: ArrowLeft بدل ArrowRight في RTL**
- الملف: `MessagesPage.tsx` سطر 13, 122
- الإصلاح: استبدال `ArrowLeft` بـ `ArrowRight`

**3. CarryforwardHistoryPage: بدون زر رجوع**
- الملف: `CarryforwardHistoryPage.tsx` سطر 95
- الإصلاح: إضافة `useNavigate` وزر رجوع مع `ArrowRight`

**4. SettingsPage: 15 تبويب مكدسة على الجوال**
- الملف: `SettingsPage.tsx` سطر 639-700
- الإصلاح: إضافة `Select` dropdown للجوال يحل محل `TabsList` على الشاشات الصغيرة، مع إخفاء `TabsList` على `md:hidden` وعرض `Select` على `md:hidden` فقط

**5. DashboardLayout: هيدر الجوال بلا السنة المالية**
- الملف: `DashboardLayout.tsx` سطر 351
- الإصلاح: إضافة سطر فرعي صغير يعرض `fiscalYear.label` تحت عنوان الصفحة

### المجموعة 2 — إصلاحات منطقية

**6. useMessaging: `type` مفقود من dependency array**
- الملف: `useMessaging.ts` سطر 38
- الإصلاح: إضافة `type` لمصفوفة التبعيات

**7. useWebAuthn: نجاح بدون tokens = جلسة وهمية**
- الملف: `useWebAuthn.ts` سطر 157-170
- الإصلاح: إضافة تحقق `if (!result.access_token || !result.refresh_token)` قبل إعلان النجاح

**8. usePaymentInvoices: عدم إبطال cache العقود بعد التسديد**
- الملف: `usePaymentInvoices.ts` سطر 97-103 و 112-118
- الإصلاح: إضافة `qc.invalidateQueries({ queryKey: ['contracts'] })` في `onSuccess` لـ `useMarkInvoicePaid` و `useMarkInvoiceUnpaid`

**9. SettingsPage: إضافة خيار 60 دقيقة للـ idle timeout**
- الملف: `SettingsPage.tsx` سطر 612-616
- الإصلاح: إضافة `<SelectItem value="60">60 دقيقة</SelectItem>`

**10. DashboardLayout: ROUTE_TITLES يفتقد `/waqif` الفعلي**
- الملف: `DashboardLayout.tsx` سطر 160
- الحالة: `/waqif` موجود فعلا في `ROUTE_TITLES` — لكن الواقف عمليا يصل عبر مسار `/beneficiary/waqif-dashboard` الغير مُغطى. سيُضاف هذا المسار.

## ملفات لن تُعدّل

- `config.toml` — `verify_jwt=false` مقصود مع تحقق داخلي (كما هو موضح في Memory)
- `FiscalYearContext` — `useCallback` تحسين أداء غير ضروري حاليا مع 14 مستفيد فقط
- `use-toast.ts` — ملف shadcn قياسي لا يُعدّل
- `lookup_by_national_id` — تحسين أداء مستقبلي (14 مستفيد = لا مشكلة حاليا)

