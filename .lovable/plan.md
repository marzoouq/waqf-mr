## الهدف
تثبيت مصدر خطأ `The provided callback is no longer runnable` نهائياً في كل الصفحات المعتمدة على `useList`، مع إضافة تسجيل تشخيصي محدود وآمن في `useListQuery` و`PropertiesPage`، ثم تشغيل مصفوفة تحقق كاملة عبر TypeScript وESLint وVitest.

## ما سيتم تغييره

### 1. تثبيت `useListQuery` ضد تكرار العطل
- تعديل `src/hooks/data/core/crud/useListQuery.ts` فقط في طبقة `hooks/data`.
- إبقاء إزالة `useMemo + ...query` الحالية لأنها السبب الأقوى للعطل.
- إزالة أي تحديث حالة داخل `queryFn` مثل `setTotalCount(count)` لأنها side effect داخل دالة الاستعلام وقد تتداخل مع دورة حياة `QueryObserver`.
- نقل تحديث `totalCount` إلى `useEffect` يعتمد على نتيجة الاستعلام، بحيث يصبح `queryFn` نقياً: يجلب البيانات ويرمي الخطأ فقط.
- إضافة `meta` للاستعلام تتضمن `table`, `queryKey`, `label`, `page`, `rangeFrom`, `rangeTo` لتظهر في التسجيل العام وتسهّل تتبع الصفحة/الجدول.
- إضافة `onRecoverableError` داخلي عبر `logger.warn/error` عند حالات: فشل الاستعلام، إعادة المحاولة/التعافي، وتغيّر الصفحة.

### 2. تسجيل تشخيصي في `PropertiesPage`
- التعديل في `src/hooks/page/admin/management/usePropertiesPage.ts` وليس داخل صفحة العرض نفسها قدر الإمكان، احتراماً لنمط Page Hook Pattern.
- تسجيل سياق الصفحة عند فشل `propertiesQuery` أو عند عودة البيانات بعد خطأ سابق:
  - اسم الصفحة: `PropertiesPage`
  - query key/الصفحة الحالية إن كانت متاحة
  - عدد العقارات والعقود
  - حالة التحميل/الخطأ
- عدم استخدام `console.*` إطلاقاً؛ التسجيل عبر `@/lib/logger` فقط.
- إبقاء `src/pages/dashboard/PropertiesPage.tsx` منطقية-خفيفة؛ لا إضافة منطق بيانات داخل JSX إلا إذا لزم تمرير حالة خطأ للعرض.

### 3. ضمان عدم تكراره في مستهلكي `useList`
- إضافة اختبار regression في `src/hooks/data/core/useCrudFactory.test.ts` أو ملف قريب يثبت أن `useList`:
  - لا يستخدم `useMemo` لتخزين `UseQueryResult`.
  - لا يكسر pagination.
  - يتعامل مع `count` دون تحديث حالة داخل `queryFn`.
- فحص كل مستهلكي `useList` الذين ظهروا في البحث: properties, units, contracts, invoices, income, expenses, beneficiaries, accounts, bylaws.
- لن يتم تعديل كل الصفحات؛ الإصلاح سيكون مركزياً في `useListQuery` لأن كل هذه الهوكات تمر عبره.

### 4. فحص شامل بعد الإصلاح
سيتم تشغيل الأوامر التالية بعد التنفيذ:
- `npm run typecheck` أو `npx tsc --noEmit`
- `npm run lint` أو `npx eslint .`
- `bunx vitest run`

وفي حال ظهر فشل:
- أتوقف عند أول فشل مؤثر.
- أقدّم اسم الملف والسبب وخطة تصحيح محدودة.
- لا أوسّع نطاق التعديل خارج الملفات المرتبطة بالمشكلة.

## الملفات المتوقعة
- `src/hooks/data/core/crud/useListQuery.ts`
- `src/hooks/page/admin/management/usePropertiesPage.ts`
- `src/hooks/data/core/useCrudFactory.test.ts` أو اختبار قريب موجود

## خارج النطاق
- لا تعديل على Edge Functions.
- لا تعديل على ملفات المصادقة المحمية.
- لا تعديل على `src/integrations/supabase/client.ts` أو `types.ts` أو `.env` أو `supabase/config.toml`.
- لا حذف ملفات أو تبعيات.