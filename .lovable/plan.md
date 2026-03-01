

# مراجعة شاملة: هل النسب ثابتة وهل جميع الملاحظات صحيحة؟

---

## نتيجة التحقق

بعد مراجعة الكود الفعلي مقابل الوثائق والتقارير، هذا ما وجدته:

### النسب في التطبيق الرئيسي: ديناميكية (صحيحة)

التطبيق يخزن النسب في `app_settings` كمفاتيح `admin_share_percentage` و `waqif_share_percentage` ويقرأها ديناميكيا في:
- `useComputedFinancials.ts` - يحسب الحصص بالنسب المخزنة (افتراضي 10% و 5% فقط عند عدم وجود قيمة)
- `useAccountsPage.ts` - يعرض ويعدل النسب
- `SettingsPage.tsx` - يسمح بتغيير النسب من الإعدادات

### المشاكل المؤكدة (3 مشاكل حقيقية)

#### 1. نسب ثابتة كنص في المساعد الذكي (متوسطة)
**الملف:** `supabase/functions/ai-assistant/index.ts` السطر 241-242

المساعد يعرض النص: `"حصة الناظر (10%)"` و `"حصة الواقف (5%)"` كنص ثابت. الارقام الفعلية (`acc.admin_share`) صحيحة لانها من قاعدة البيانات، لكن النسبة المكتوبة بين الاقواس ثابتة.

**الاصلاح:** جلب `admin_share_percentage` و `waqif_share_percentage` من جدول `app_settings` في دالة بناء السياق، واستخدام القيم الفعلية في النص.

#### 2. بيانات وقف حقيقية كـ fallback في فاتورة PDF (متوسطة)
**الملف:** `supabase/functions/generate-invoice-pdf/index.ts` السطور 211-214

اذا فشل جلب الاعدادات، تُطبع الفاتورة باسم وقف ورقم صك ومحكمة حقيقية مضمنة في الكود. هذا خطر اذا تغيرت البيانات او اعيد استخدام النظام.

**الاصلاح:** استبدال القيم الافتراضية بنص عام ("غير محدد") او رفض انشاء الفاتورة عند عدم توفر البيانات.

#### 3. import غير مستخدم في DashboardLayout (منخفضة)
**الملف:** `src/components/DashboardLayout.tsx` السطر 29

`import { supabase }` موجود لكن غير مستخدم في اي مكان بالملف. تاكدت بالبحث عن `supabase.` في الملف ولم اجد اي استخدام.

**الاصلاح:** حذف سطر الاستيراد.

---

## التفاصيل التقنية

### تعديل 1: المساعد الذكي
في `supabase/functions/ai-assistant/index.ts`:
- اضافة جلب مفتاحي `admin_share_percentage` و `waqif_share_percentage` من `app_settings` ضمن دالة بناء السياق
- تغيير السطر 241 من `حصة الناظر (10%)` الى `حصة الناظر (${adminPct}%)`
- تغيير السطر 242 من `حصة الواقف (5%)` الى `حصة الواقف (${waqifPct}%)`

### تعديل 2: فاتورة PDF
في `supabase/functions/generate-invoice-pdf/index.ts`:
- تغيير السطور 211-214 لاستخدام `'غير محدد'` بدل البيانات الحقيقية كقيم افتراضية

### تعديل 3: DashboardLayout
في `src/components/DashboardLayout.tsx`:
- حذف السطر 29 (`import { supabase }`)

### الملفات المتاثرة:
1. `supabase/functions/ai-assistant/index.ts`
2. `supabase/functions/generate-invoice-pdf/index.ts`
3. `src/components/DashboardLayout.tsx`

