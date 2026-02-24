

# خطة إصلاح المشاكل الـ 5 المتبقية

---

## 1. تنظيف الأسطر الفارغة في Edge Function (🟠)
**الملف:** `supabase/functions/admin-manage-users/index.ts`

الأسطر 19، 39، 47، 110 فارغة حيث كانت `console.log` statements. سيتم حذف الأسطر الفارغة الزائدة للتنظيف.

---

## 2. إضافة معالجة الفشل الجزئي لـ reorderBylaws (🟠)
**الملف:** `src/hooks/useBylaws.ts` (سطر 55-63)

**المشكلة:** `Promise.all` يرسل تحديثات متعددة — إذا فشل أحدها ونجحت البقية، يصبح الترتيب غير متسق.

**الإصلاح:** استخدام دالة RPC في قاعدة البيانات لتنفيذ إعادة الترتيب كعملية واحدة (transaction). سيتم:
- إنشاء migration بدالة `reorder_bylaws(items jsonb)` تنفذ كل التحديثات في transaction واحد
- تحديث `useBylaws.ts` لاستدعاء `.rpc('reorder_bylaws', ...)` بدلاً من `Promise.all`

---

## 3. إضافة `typecheck` script (🟡)
**الملف:** `package.json`

إضافة:
```json
"typecheck": "tsc --noEmit"
```

---

## 4. إضافة `limit` لـ useAllUnits (🟢)
**الملف:** `src/hooks/useUnits.ts`

إضافة `.limit(500)` لمنع جلب أكثر من 500 وحدة (حماية من تجاوز حد Supabase الافتراضي 1000).

---

## 5. دمج استعلامات app_settings (🟢)
**الملفات:** `src/hooks/useWaqfInfo.ts` + `src/hooks/useAppSettings.ts`

**المشكلة:** كلاهما يستعلم من `app_settings` بشكل منفصل.

**الإصلاح:** توحيد الاستعلام في `useAppSettings` ليجلب كل الإعدادات مرة واحدة، ثم يستخرج `useWaqfInfo` بياناته من نفس الـ cache عبر `queryKey` مشترك.

---

## القسم التقني

| الملف | نوع التغيير |
|-------|-------------|
| `admin-manage-users/index.ts` | تنظيف أسطر فارغة |
| `useBylaws.ts` | استبدال `Promise.all` بـ RPC |
| `supabase/migrations/` | دالة `reorder_bylaws` جديدة |
| `package.json` | إضافة script |
| `useUnits.ts` | إضافة `.limit(500)` |
| `useWaqfInfo.ts` + `useAppSettings.ts` | توحيد استعلام `app_settings` |

