<div dir="rtl">

# دليل التعليقات المرجعية (Reference Comments)

> **الغرض**: يربط هذا الملف كل تعليق `// #N` أو `// #X12` المتبقي في الكود بسياقه التاريخي من تقارير الفحص العميق (Deep Audit Reports). هذه المراجع كانت تُكتب عند تنفيذ توصية فحص لتوثيق *لماذا* الكود يبدو بهذا الشكل.

> **سياسة المراجع**: لا نحتفظ إلا بالتعليقات التي تحمل **rationale معماري/أمني/أدائي حقيقي** لا يظهر من قراءة الكود نفسه. التعليقات الواضحة (مثل "useCallback لتثبيت المرجع") والإشارات لإصلاحات قديمة منتهية أُزيلت في موجة التنظيف.

## كيف تقرأ المراجع

| النمط | المصدر | المثال |
|------|--------|--------|
| `#N` (رقم) | تقرير الفحص العميق العام (Deep Audit) | `// #15 perf: monitoring يُستورد ديناميكياً` |
| `#A10` | موجة A — تحسينات الأداء على Loops | `// #A10 — دمج loops` |
| `#B3` | موجة B — توحيد الحسابات المالية | `// #B3 — تحذير عند السنة النشطة` |

---

## الفهرس السريع

- [أداء التطبيق (Performance)](#أداء-التطبيق)
- [إدارة TanStack Query وذاكرة التخزين](#إدارة-tanstack-query)
- [أمان المالية والصلاحيات](#أمان-المالية-والصلاحيات)
- [الموجات المُصنّفة](#الموجات-المُصنّفة)

---

## أداء التطبيق

### `#3` perf — Predicate دقيق لـ invalidateQueries
**القاعدة**: عند `invalidateQueries`، استخدم predicate يطابق المفتاح الأول فقط بدلاً من إبطال كل شيء.
**مثال**: `src/hooks/data/core/useDashboardRealtime.ts`

### `#4` perf — تعطيل refetch في الخلفية للتبويبات غير المرئية
**القاعدة**: `refetchOnWindowFocus: false` للاستعلامات الثقيلة — يوفر ~120 طلب/ساعة لكل تبويب.
**مثال**: `src/hooks/data/zatca/useZatcaOperationLog.ts`

### `#13` perf — تحميل خط PDF عند `beforeprint` فقط
**القاعدة**: لا تحمّل خط Amiri/Tajawal على mount — أجّله حتى نية الطباعة الفعلية.
**مثال**: `src/components/common/PrintHeader.tsx`

### `#14` perf — `requestIdleCallback` للمراقبة
**القاعدة**: أدوات المراقبة (analytics, monitoring) تُحمّل في وقت الخمول لتحرير main thread.
**مثال**: `src/main.tsx`

### `#15` perf — Dynamic import لـ monitoring
**القاعدة**: `import('@/lib/monitoring')` ديناميكياً داخل `signOut()` لتقليل initial bundle.
**مثال**: `src/contexts/AuthContext.tsx`

---

## إدارة TanStack Query

### `#11` perf — تجاهل أخطاء auth في mutationCache
**القاعدة**: 401/403 يعالجها `AuthContext` و `ProtectedRoute` — لا تكرّر toast.
**مثال**: `src/lib/queryClient.ts`

### `#12` perf — تخفيض gcTime من 30د إلى 10د
**القاعدة**: توازن أفضل لذاكرة الجوال — الأكثر استخداماً يُعاد جلبه بسرعة.
**مثال**: `src/lib/queryClient.ts`

### `#33` — staleTime افتراضي 60 ثانية
**القاعدة**: تخفيض من 5د إلى 60ث للحصول على أرضية آمنة لـ realtime sync.
البيانات الثابتة تستخدم `STALE_STATIC = 5د` بشكل صريح.
**مثال**: `src/lib/queryClient.ts`

---

## أمان المالية والصلاحيات

### `#9` — تفضيل serverMyShare على الحساب المحلي
**القاعدة**: عند توفر `my_share` من RPC الخادم، استخدمه. الحساب المحلي fallback فقط.
**مثال**: `src/hooks/financial/useMyShare.ts`

### `#10` — الناظر فقط يقفل السنة
**القاعدة**: المحاسب لم يعد يملك صلاحية إقفال السنة المالية (تم سحبها في موجة security hardening).
**مثال**: `src/utils/financial/fiscalYearClosure.test.ts`

### `#12` — `my_share_is_estimated` للسنة النشطة
**القاعدة**: عند عرض حصة لسنة نشطة (غير مقفلة)، علّم الرقم بأنه تقديري عبر هذا الحقل من RPC.
**مثال**: `src/hooks/page/beneficiary/financial/useMySharePage.ts`

### `#12` — عدد المستفيدين الفعلي من RPC
**القاعدة**: لا تستخدم `length` من قائمة العام (مفلترة) — اطلب العدد الفعلي من RPC `get_total_beneficiaries`.
**مثال**: `src/hooks/page/beneficiary/dashboard/useWaqifDashboardPage.ts`

### `#13` — نسب الحصص من RPC بدل الحساب المحلي
**القاعدة**: مجموع نسب المستفيدين قد لا يساوي 100% — اعتمد على RPC `get_total_beneficiary_percentage`.
**مثال**: `src/hooks/page/beneficiary/financial/useDisclosurePage.ts`

### `#17` — حسابات صفرية = خطأ حرج
**القاعدة**: محاولة إقفال سنة بحسابات صفرية تُعد خطأً حرجاً (يمنع الإقفال) — لا تحذيراً.
راجع `mem://features/admin/fiscal-closure-validation-system`.
**مثال**: `src/components/accounts/closeYearChecklist.utils.ts`

### `#34` — المحاسب يُعامَل كـ admin تشغيلياً
**القاعدة**: في فحص "non-admin"، استثنِ المحاسب لأنه يحتاج وصول CRUD.
**مثال**: `src/contexts/FiscalYearContext.tsx`

### `#49` — نسبة الزكاة قابلة للتغيير
**القاعدة**: زكاة 2.5% ليست hardcoded — تُقرأ من `app_settings`.
**مثال**: `src/components/reports/ZakatEstimationReport.tsx`

### `#63` fix — `undefined` بدلاً من falsy check
**القاعدة**: `my_share === 0` على سنة نشطة قيمة صحيحة — استخدم `=== undefined` للتمييز بين "لم يُحمّل" و"يساوي صفراً".
**مثال**: `src/hooks/page/beneficiary/financial/useMySharePage.ts`

### `#64` fix — default false للسلف
**القاعدة**: `advances_enabled` افتراضياً `false` لمنع طلبات سلف بدون إعداد صريح.
**مثال**: `src/hooks/page/beneficiary/financial/useMySharePage.ts`

---

## الموجات المُصنّفة

### موجة A — تحسينات Loops

#### `#A10` — دمج loops
**القاعدة**: في `useContractsPage`، بناء `invoicePaidMap` و `overdueContractIds` يتم في loop واحد بدلاً من اثنين.
**مثال**: `src/hooks/page/admin/contracts/useContractsPage.ts`

### موجة B — توحيد الحسابات المالية

#### `#B3` — تحذير السنة النشطة في PDF
**القاعدة**: عند توليد PDF لسنة نشطة (غير مقفلة)، أظهر toast warning أن القيم تقديرية.
**مثال**: `src/hooks/page/beneficiary/financial/useMySharePdfHandlers.ts`

---

## إضافة مرجع جديد

عند توصية فحص جديدة تستحق التوثيق:
1. تأكد أنها تحمل rationale لا يظهر من قراءة الكود (perf/security/business).
2. أعطها رقماً متسلسلاً (يفضّل 3 خانات للموجات الجديدة: `#101`, `#102`...).
3. للموجات المُصنّفة: استخدم بادئة حرف (E1, E2, ...).
4. أضف سطراً هنا في القسم المناسب قبل دمج التغيير.
5. **لا** تضف مرجعاً لتعليق يشرح الواضح أو يصف "ماذا" بدل "لماذا".

</div>
