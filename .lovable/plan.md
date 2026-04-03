

# نقل استعلام Supabase من ContractsViewPage إلى هوك بيانات

## المشكلة
الاستيراد ليس "غير مستخدم" — بل يُستخدم في استعلام مباشر لجلب أسماء العقارات (سطر 47–59). هذا يخالف نمط فصل البيانات عن UI الذي طبّقناه على 6 مكونات أخرى.

## الحل

### 1. إنشاء `src/hooks/data/usePropertiesMap.ts` (~25 سطر)
- نقل استعلام `properties_names` + بناء `map` إلى هوك يستقبل `propertyIds: string[]`
- يُعيد `{ data: Record<string, string> }`

### 2. تعديل `ContractsViewPage.tsx`
- حذف استيراد `supabase` و `useQuery` و `STALE_STATIC`
- استبدال الاستعلام المباشر بـ `usePropertiesMap(propertyIds)`

| العملية | الملف |
|---------|-------|
| إنشاء | `src/hooks/data/usePropertiesMap.ts` |
| تعديل | `src/pages/beneficiary/ContractsViewPage.tsx` |

