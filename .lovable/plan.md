# فحص جنائي — `The provided callback is no longer runnable`

## 1) موقع الخطأ
- ملف المصدر بعد الـ minify: `vendor-query` (TanStack Query) → الإطار الأخير في تطبيقنا: `useList` في
  `src/hooks/data/core/crud/useListQuery.ts:102` (مدعوم بـ Stack: `useMemo` → `useList` → `PropertiesPage`).
- المستهلك المباشر: `usePropertiesPage` → `useProperties()` (مبني عبر `createCrudFactory`).

## 2) السبب الجذري (تشخيص قطعي)
داخل `useList` نُعيد:
```ts
return useMemo(() => ({
  ...query,           // ← هنا الفخ
  page, nextPage, prevPage, goToPage,
  hasNextPage, hasPrevPage, pageSize: limit,
}), [query, ...]);
```
- `query` كائن **UseQueryResult** من TanStack Query v5، خصائصه **getters متعقَّبة** (tracked properties) مرتبطة بـ `QueryObserver` نشط.
- عند `...query` يتم استدعاء كل getter، وداخلياً يجدول الـ Observer callback. إذا أُلغي اشتراك الـ Observer (StrictMode double-mount، أو إعادة بناء بسبب تغيّر `queryKey` مع تصفّح الصفحات، أو unmount متزامن مع render)، يصبح callback الداخلي "no longer runnable" ويُرمى `Error: The provided callback is no longer runnable.`
- وضْع الـ spread داخل `useMemo` يفاقم المشكلة لأن الاعتماد `[query]` يجعل react يعيد تنفيذ المصنع في توقيتات تتزامن مع تبديل الـ Observer (تنقّل الصفحة، تحديث `setTotalCount` داخل `queryFn` يُحدث مرجع `query`).

## 3) لماذا يظهر فقط في PropertiesPage الآن
- `PropertiesPage` يستخدم `serverPage/serverNextPage/...` ⇒ يفعّل مسار `useMemo` مع تغيّرات `page`.
- بعد تنظيف الكود الأخير لم يتغيّر هذا الملف، لكن انتهاء جلسة وتسجيل خروج (الـ replay يُظهر `session_expired`) يُسرّع unmount للـ Observers أثناء render → يكشف الخلل.

## 4) دلائل مساندة
- لا يوجد `console.error` يشير لأي شيء آخر؛ الخطأ صادر حصراً من `vendor-query`.
- الـ replay يؤكد الكراش وقع بعد فتح قائمة "تصدير PDF" ثم انتهاء الجلسة (unmount مفاجئ للصفحة).
- باقي الاستهلاك (`useUnits`, اختبارات `useProperties`) لا يستخدم spread خارجي ⇒ لا يتأثر.

## 5) الإصلاح المقترح (الحد الأدنى، بدون تغيير API)
تعديل واحد فقط في `src/hooks/data/core/crud/useListQuery.ts` لإزالة spread للـ `query` داخل `useMemo` مع الحفاظ على نفس الواجهة العمومية:

```ts
// بدل useMemo + ...query
return {
  ...query,                       // spread خارج useMemo، مرة واحدة لكل render (آمن، لا تخزين مرجع طويل العمر)
  page,
  nextPage,
  prevPage,
  goToPage,
  hasNextPage,
  hasPrevPage,
  pageSize: limit,
};
```
لماذا هذا يحلّ المشكلة:
- لا نحتفظ بمرجع `query` داخل `useMemo` بعد إبطال الـ Observer.
- TanStack Query يتوقّع spread أثناء render فقط (لا داخل closure مؤجل) — وهو نمطه الرسمي.
- لا تأثير على re-renders: `useQuery` نفسه يتحكم في إعادة التصيير عبر الـ tracked getters.

البديل (دفاعي إضافي، اختياري):
- استبدال `setTotalCount` من داخل `queryFn` بـ `useEffect` يراقب `query.data`/`count` ⇒ يقلّل re-renders ويُبعد تأثيرات جانبية عن `queryFn`.

## 6) نطاق التغيير
- **ملف واحد فقط**: `src/hooks/data/core/crud/useListQuery.ts` (دالة `useList`).
- لا تغيير على: `useCrudFactory.ts`, الأنواع، المستهلكين، الاختبارات.

## 7) خطة التحقق (إلزامية بعد التنفيذ)
1. `rg "useMemo" src/hooks/data/core/crud/useListQuery.ts` → لا spread لـ `query` داخل memo.
2. `npx tsc --noEmit` → 0 أخطاء.
3. `bunx vitest run` → 2076/2076 (خاصة `useProperties.test.ts`).
4. `npx vite build` → نجاح.
5. تشغيل المعاينة → دخول `PropertiesPage` → التصفح بين الصفحات → فتح/إغلاق export → التأكد من اختفاء `The provided callback is no longer runnable` من Console.

## 8) ما لن أفعله
- لن أعدّل أي شيء في AuthContext أو ProtectedRoute (الجلسة المنتهية مجرد كاشف، ليست السبب).
- لن ألمس Edge Functions أو RLS أو migrations.
- لن أغيّر public API لـ `createCrudFactory`.
